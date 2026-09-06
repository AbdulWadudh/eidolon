import { CHAT_TURN, MIND_UPDATE, PERSONA_GUARD } from "@eidolon/config";
import { sample } from "es-toolkit";
import { stripMindBlock } from "@/orchestrator/mind-block";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
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
  tripped: boolean;
  emitted: number;
}

async function streamOnce(
  ws: WebSocketSender,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<StreamResult> {
  const filter = createPersonaFilter();
  const mind = createMindTail();
  // Asterisks are held back until they close, so a paragraph of narration is
  // dropped before the reader ever sees it begin.
  const gate = createActionGate();
  // The bracketed photo note in history is a form the model happily copies. The
  // stop names that note specifically rather than any open bracket, so the
  // trailing state block still has room to arrive. The blank line is not a stop
  // sequence either: the model puts one in front of that block, so stopping
  // there threw away the state update on every turn. Brevity is enforced below
  // instead, where a blank line ends the prose without ending the stream.
  const stop = [...CHAT_TURN.photoNoteStops, ...CHAT_TURN.readerTurnStops];
  let reply = "";
  let said = false;
  let drained = 0;

  for await (const token of streamChatCompletion(messages, signal, {
    temperature: CHAT_TURN.temperature,
    maxTokens: CHAT_TURN.maxTokens + MIND_UPDATE.extraTokens,
    presencePenalty: CHAT_TURN.presencePenalty,
    frequencyPenalty: CHAT_TURN.frequencyPenalty,
    stop,
  })) {
    if (signal.aborted) break;

    const safe = mind.push(filter.push(token));
    if (filter.tripped()) break;

    // The reply has already said enough. Prose stops here, but the stream keeps
    // running for a short while so the trailing state block can still land.
    if (said) {
      drained += token.length;
      // Breaking the moment capture starts would keep the marker and throw away
      // the JSON body behind it. The block is only complete once it closes.
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
    }

    if (breakAt >= 0 || hasSaidEnough(reply)) said = true;
  }

  const tail = gate.push(mind.push(filter.flush()) + mind.flush()) + gate.flush();
  if (tail.length > 0 && !said) {
    reply += tail;
    emit(ws, tail, isActionChunk(tail));
  }

  return {
    reply,
    mindBlock: mind.captured(),
    tripped: filter.tripped(),
    emitted: filter.emitted(),
  };
}

// The action has already streamed by the time this runs, so it continues the
// same turn. Collected rather than streamed because the continuation is itself
// stripped of stage directions — the model reliably offers another one.
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
      [...messages, ...resumed, mustSpeakReminder()],
      signal,
      {
        temperature: CHAT_TURN.temperature,
        maxTokens: CHAT_TURN.maxTokens,
        presencePenalty: CHAT_TURN.presencePenalty,
        frequencyPenalty: CHAT_TURN.frequencyPenalty,
        stop: [...CHAT_TURN.photoNoteStops, ...CHAT_TURN.readerTurnStops],
      },
    )) {
      raw += token;
      if (raw.length > CHAT_TURN.maxReplyChars) break;
    }
  } catch {
    return sample(PERSONA_GUARD.spokenFallbacks);
  }

  // This continuation does not run through the mind tail, so a state block the
  // model appends here would reach the reader as prose. It is cut off the end
  // before anything else looks at the text.
  const said = spokenWords(stripMindBlock(raw));
  // This path hands the model a reminder and asks it to try again, which is
  // exactly when it is most likely to recite the reminder instead.
  if (said.length === 0 || leaksInstruction(said)) {
    return sample(PERSONA_GUARD.spokenFallbacks);
  }
  return said;
}

export interface ReplyOutcome {
  reply: string;
  mindBlock: string;
}

export async function streamReply(
  ws: WebSocketSender,
  messages: ChatMessage[],
  signal: AbortSignal,
  said: string[] = [],
  characterName = "",
): Promise<ReplyOutcome> {
  let result = await streamOnce(ws, messages, signal);

  for (
    let retry = 0;
    result.tripped && result.emitted === 0 && retry < PERSONA_GUARD.maxRetries;
    retry += 1
  ) {
    if (signal.aborted) return { reply: result.reply, mindBlock: result.mindBlock };
    result = await streamOnce(ws, [...messages, hardenedReminder()], signal);
  }

  if (result.tripped && result.emitted === 0) {
    const line = deflection();
    emit(ws, line, false);
    return { reply: line, mindBlock: "" };
  }

  // A run of photos fills the history with bare stage directions, and the model
  // starts answering in kind: "smiles", "blushes", nothing said out loud. The
  // action has already streamed by this point, so this continues the same turn
  // rather than restarting it — the client appends deltas either way.
  // The reply has already streamed, so a duplicate cannot be unsent — it is
  // replaced instead. Penalties only shape newly generated tokens; nothing in
  // the sampler stops the model reciting a line already in its own history.
  if (repeatsHistory(result.reply, said) && !signal.aborted) {
    const fresh = await streamOnce(
      { send: () => undefined },
      [...messages, freshLineReminder()],
      signal,
    );
    if (fresh.reply.trim().length > 0 && !repeatsHistory(fresh.reply, said)) {
      sendServerMessage(ws, { type: "text_replace", payload: { text: fresh.reply } });
      result = fresh;
    }
  }

  // Nothing said out loud: either the reply was one bare stage direction, or it
  // was a paragraph of asterisks and the gate dropped all of it. Either way the
  // turn carries on until there are words.
  if (spokenWords(result.reply).length === 0 && !signal.aborted) {
    const line = await sayItOutLoud(messages, result.reply, signal);
    const spacer = result.reply.trim().length > 0 ? " " : "";
    emit(ws, `${spacer}${line}`, false);
    return { reply: `${result.reply}${spacer}${line}`.trim(), mindBlock: result.mindBlock };
  }

  // Example dialogue is a transcript, and the model copies its speaker label or
  // slips into writing about itself in the third person. Both are already on the
  // wire by now, so the corrected line replaces what was streamed.
  if (characterName.length > 0 && !signal.aborted) {
    if (narratesInThirdPerson(result.reply, characterName)) {
      const spoken = await sayItOutLoud(messages, "", signal);
      sendServerMessage(ws, { type: "text_replace", payload: { text: spoken } });
      return { reply: spoken, mindBlock: result.mindBlock };
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

  // A reminder is a system turn, and the model sometimes answers by repeating it
  // rather than obeying it. That text is an instruction, not something a person
  // would say, so it is replaced rather than shown.
  if (leaksInstruction(result.reply)) {
    const line = sample(PERSONA_GUARD.spokenFallbacks);
    sendServerMessage(ws, { type: "text_replace", payload: { text: line } });
    return { reply: line, mindBlock: result.mindBlock };
  }

  return { reply: result.reply, mindBlock: result.mindBlock };
}
