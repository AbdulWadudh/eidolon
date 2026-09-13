import { sample } from "es-toolkit";
import { CHAT_TURN, MIND_UPDATE, PERSONA_GUARD } from "@/config";
import { stripMindBlock } from "@/orchestrator/mind-block";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { PROFILE, placeSystemNote, STOP_TOKENS } from "@/services/llm-profile";
import { freshLineReminder, hardenedReminder, mustSpeakReminder } from "@/services/persona";
import { createPersonaFilter, deflection, leaksInstruction } from "@/services/persona-guard";
import { hasSaidEnough, repeatsHistory, spokenWords } from "@/services/reply-length";
import {
  bracketsToActions,
  narratesInThirdPerson,
  stripSpeakerLabel,
} from "@/services/self-reference";
import { createActionGate, isActionChunk } from "@/services/stage-directions";
import { createMindTail } from "@/ws/mind-tail";
import { createOutputTags } from "@/ws/output-tags";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

const PARAGRAPH_BREAK = String.fromCharCode(10, 10);

export function emit(ws: WebSocketSender, text: string, narrating: boolean): void {
  if (text.length === 0) return;
  sendServerMessage(ws, {
    type: "text_delta",
    payload: { token: text, is_narration: narrating },
  });
}

interface StreamResult {
  reply: string;
  mindBlock: string;
  visualPrompt: string;
  tripped: boolean;
  emitted: number;
}

export interface ReplyHooks {
  onSpeech?: (text: string) => void;
}

async function streamOnce(
  ws: WebSocketSender,
  messages: ChatMessage[],
  signal: AbortSignal,
  hooks: ReplyHooks = {},
): Promise<StreamResult> {
  const filter = createPersonaFilter();
  const mind = createMindTail();
  const tags = createOutputTags();
  const gate = createActionGate();

  const stop = [...STOP_TOKENS, ...CHAT_TURN.photoNoteStops, ...CHAT_TURN.readerTurnStops];
  let reply = "";
  let said = false;
  let drained = 0;

  for await (const token of streamChatCompletion(messages, signal, {
    temperature: PROFILE.sampling.temperature,
    topP: PROFILE.sampling.topP,
    minP: PROFILE.sampling.minP,
    repeatPenalty: PROFILE.sampling.repeatPenalty,
    maxTokens: CHAT_TURN.maxTokens + MIND_UPDATE.extraTokens,
    presencePenalty: PROFILE.sampling.presencePenalty,
    frequencyPenalty: PROFILE.sampling.frequencyPenalty,
    stop,
  })) {
    if (signal.aborted) break;

    const safe = mind.push(filter.push(tags.push(token)));
    if (filter.tripped()) break;

    if (said) {
      drained += token.length;
      const blockClosed = mind.isCapturing() && mind.captured().includes("]");
      if (blockClosed || drained > MIND_UPDATE.drainChars) break;
      continue;
    }

    if (safe.length === 0) continue;

    const shown = gate.push(safe);
    if (shown.length === 0) continue;

    const breakAt = CHAT_TURN.stopOnBlankLine ? shown.indexOf(PARAGRAPH_BREAK) : -1;
    const visible = breakAt >= 0 ? shown.slice(0, breakAt) : shown;

    if (visible.length > 0) {
      reply += visible;
      emit(ws, visible, isActionChunk(visible));
      hooks.onSpeech?.(visible);
    }

    if (breakAt >= 0 || hasSaidEnough(reply)) said = true;
  }

  const tail =
    gate.push(mind.push(filter.push(tags.flush()) + filter.flush()) + mind.flush()) + gate.flush();
  if (tail.length > 0 && !said) {
    reply += tail;
    emit(ws, tail, isActionChunk(tail));
    hooks.onSpeech?.(tail);
  }

  return {
    reply,
    mindBlock: mind.captured(),
    visualPrompt: tags.visualPrompt(),
    tripped: filter.tripped(),
    emitted: filter.emitted(),
  };
}

async function sayItOutLoud(
  messages: ChatMessage[],
  action: string,
  signal: AbortSignal,
): Promise<string> {
  const resumed: ChatMessage[] =
    action.trim().length > 0 ? [{ role: "assistant", content: action }] : [];
  let raw = "";
  try {
    for await (const token of streamChatCompletion(
      placeSystemNote([...messages, ...resumed], mustSpeakReminder()),
      signal,
      {
        temperature: PROFILE.sampling.temperature,
        topP: PROFILE.sampling.topP,
        minP: PROFILE.sampling.minP,
        repeatPenalty: PROFILE.sampling.repeatPenalty,
        maxTokens: CHAT_TURN.maxTokens,
        presencePenalty: PROFILE.sampling.presencePenalty,
        frequencyPenalty: PROFILE.sampling.frequencyPenalty,
        stop: [...STOP_TOKENS, ...CHAT_TURN.photoNoteStops, ...CHAT_TURN.readerTurnStops],
      },
    )) {
      raw += token;
      if (raw.length > CHAT_TURN.maxReplyChars) break;
    }
  } catch {
    return sample(PERSONA_GUARD.spokenFallbacks);
  }

  const said = spokenWords(stripMindBlock(raw));

  if (said.length === 0 || leaksInstruction(said)) {
    return sample(PERSONA_GUARD.spokenFallbacks);
  }
  return said;
}

export interface ReplyOutcome {
  reply: string;
  mindBlock: string;
  visualPrompt: string;
}

export async function streamReply(
  ws: WebSocketSender,
  messages: ChatMessage[],
  signal: AbortSignal,
  said: string[] = [],
  characterName = "",
  hooks: ReplyHooks = {},
): Promise<ReplyOutcome> {
  let result = await streamOnce(ws, messages, signal, hooks);

  for (
    let retry = 0;
    result.tripped && result.emitted === 0 && retry < PERSONA_GUARD.maxRetries;
    retry += 1
  ) {
    if (signal.aborted)
      return {
        reply: result.reply,
        mindBlock: result.mindBlock,
        visualPrompt: result.visualPrompt,
      };
    result = await streamOnce(ws, placeSystemNote(messages, hardenedReminder()), signal, hooks);
  }

  if (result.tripped && result.emitted === 0) {
    const line = deflection();
    emit(ws, line, false);
    hooks.onSpeech?.(line);
    return { reply: line, mindBlock: "", visualPrompt: result.visualPrompt };
  }

  if (repeatsHistory(result.reply, said) && !signal.aborted) {
    const fresh = await streamOnce(
      { send: () => undefined },
      placeSystemNote(messages, freshLineReminder()),
      signal,
    );
    if (fresh.reply.trim().length > 0 && !repeatsHistory(fresh.reply, said)) {
      sendServerMessage(ws, { type: "text_replace", payload: { text: fresh.reply } });
      result = fresh;
    }
  }

  if (spokenWords(result.reply).length === 0 && !signal.aborted) {
    const line = await sayItOutLoud(messages, result.reply, signal);
    const spacer = result.reply.trim().length > 0 ? " " : "";
    emit(ws, `${spacer}${line}`, false);
    hooks.onSpeech?.(`${spacer}${line}`);
    return {
      reply: `${result.reply}${spacer}${line}`.trim(),
      mindBlock: result.mindBlock,
      visualPrompt: result.visualPrompt,
    };
  }

  if (characterName.length > 0 && !signal.aborted) {
    if (narratesInThirdPerson(result.reply, characterName)) {
      const spoken = await sayItOutLoud(messages, "", signal);
      sendServerMessage(ws, { type: "text_replace", payload: { text: spoken } });
      return { reply: spoken, mindBlock: result.mindBlock, visualPrompt: result.visualPrompt };
    }

    const unlabelled = stripSpeakerLabel(result.reply, characterName);
    if (unlabelled !== result.reply) {
      sendServerMessage(ws, { type: "text_replace", payload: { text: unlabelled } });
      result = { ...result, reply: unlabelled };
    }
  }

  const asActions = bracketsToActions(result.reply);
  if (asActions !== result.reply && !signal.aborted) {
    sendServerMessage(ws, { type: "text_replace", payload: { text: asActions } });
    result = { ...result, reply: asActions };
  }

  if (leaksInstruction(result.reply)) {
    const line = sample(PERSONA_GUARD.spokenFallbacks);
    sendServerMessage(ws, { type: "text_replace", payload: { text: line } });
    return { reply: line, mindBlock: result.mindBlock, visualPrompt: result.visualPrompt };
  }

  return {
    reply: result.reply,
    mindBlock: result.mindBlock,
    visualPrompt: result.visualPrompt,
  };
}
