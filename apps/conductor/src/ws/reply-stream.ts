import { CHAT_TURN, PERSONA_GUARD } from "@eidolon/config";
import { sample } from "es-toolkit";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { freshLineReminder, hardenedReminder, mustSpeakReminder } from "@/services/persona";
import { createPersonaFilter, deflection } from "@/services/persona-guard";
import { hasSaidEnough, isActionOnly, repeatsHistory, spokenWords } from "@/services/reply-length";
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
  tripped: boolean;
  emitted: number;
}

async function streamOnce(
  ws: WebSocketSender,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<StreamResult> {
  const filter = createPersonaFilter();
  // The bracketed photo note in history is a form the model happily copies, so
  // an open bracket ends the turn rather than becoming part of a reply.
  const stop = CHAT_TURN.stopOnBlankLine
    ? [PARAGRAPH_BREAK, CHAT_TURN.photoNoteOpen]
    : [CHAT_TURN.photoNoteOpen];
  let narrating = false;
  let reply = "";

  for await (const token of streamChatCompletion(messages, signal, {
    temperature: CHAT_TURN.temperature,
    maxTokens: CHAT_TURN.maxTokens,
    presencePenalty: CHAT_TURN.presencePenalty,
    frequencyPenalty: CHAT_TURN.frequencyPenalty,
    stop,
  })) {
    if (signal.aborted) break;

    const safe = filter.push(token);
    if (filter.tripped()) break;
    if (safe.length === 0) continue;

    if (safe.includes("*")) narrating = !narrating;
    reply += safe;
    emit(ws, safe, narrating);

    // A hard stop at a sentence boundary. The prompt asks for brevity; this is
    // what makes it true even when the model keeps going.
    if (hasSaidEnough(reply)) break;
  }

  const tail = filter.flush();
  if (tail.length > 0) {
    reply += tail;
    emit(ws, tail, narrating);
  }

  return { reply, tripped: filter.tripped(), emitted: filter.emitted() };
}

// The action has already streamed by the time this runs, so it continues the
// same turn. Collected rather than streamed because the continuation is itself
// stripped of stage directions — the model reliably offers another one.
async function sayItOutLoud(
  messages: ChatMessage[],
  action: string,
  signal: AbortSignal,
): Promise<string> {
  let raw = "";
  try {
    for await (const token of streamChatCompletion(
      [...messages, { role: "assistant", content: action }, mustSpeakReminder()],
      signal,
      {
        temperature: CHAT_TURN.temperature,
        maxTokens: CHAT_TURN.maxTokens,
        presencePenalty: CHAT_TURN.presencePenalty,
        frequencyPenalty: CHAT_TURN.frequencyPenalty,
        stop: [CHAT_TURN.photoNoteOpen],
      },
    )) {
      raw += token;
      if (raw.length > CHAT_TURN.maxReplyChars) break;
    }
  } catch {
    return sample(PERSONA_GUARD.spokenFallbacks);
  }

  const said = spokenWords(raw);
  return said.length > 0 ? said : sample(PERSONA_GUARD.spokenFallbacks);
}

export async function streamReply(
  ws: WebSocketSender,
  messages: ChatMessage[],
  signal: AbortSignal,
  said: string[] = [],
): Promise<string> {
  let result = await streamOnce(ws, messages, signal);

  for (
    let retry = 0;
    result.tripped && result.emitted === 0 && retry < PERSONA_GUARD.maxRetries;
    retry += 1
  ) {
    if (signal.aborted) return result.reply;
    result = await streamOnce(ws, [...messages, hardenedReminder()], signal);
  }

  if (result.tripped && result.emitted === 0) {
    const line = deflection();
    emit(ws, line, false);
    return line;
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

  if (isActionOnly(result.reply) && !signal.aborted) {
    const line = await sayItOutLoud(messages, result.reply, signal);
    emit(ws, ` ${line}`, false);
    return `${result.reply} ${line}`.trim();
  }

  return result.reply;
}
