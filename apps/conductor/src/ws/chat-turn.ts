import { SUGGESTIONS, TTS } from "@eidolon/config";
import { type ChatTurnEvent, splitInfluence, stripInfluence } from "@eidolon/protocol";
import {
  appendMessage,
  getCharacterCard,
  getCharacterMind,
  getRecentMessages,
  saveCharacterMind,
} from "@/db";
import { appraiseTurn, nextMindState } from "@/services/affinity";
import type { ChatMessage } from "@/services/llm";
import { buildChatMessages } from "@/services/persona";
import { forHistory } from "@/services/photo-line";
import { formatSearchResults, searchWeb } from "@/services/searxng";
import { fallbackSuggestions, formatScene, generateReplySuggestions } from "@/services/suggestions";
import { synthesizeSpeech } from "@/services/tts";
import { storeVoiceNote } from "@/services/voice-notes";
import type { WebSocketSender } from "@/ws/protocol";
import { sendServerMessage } from "@/ws/protocol";
import { streamReply } from "@/ws/reply-stream";

const SEARCH_TRIGGERS = [
  "who is",
  "what is",
  "where is",
  "when did",
  "why did",
  "how to",
  "search",
  "look up",
  "lookup",
  "tell me about",
  "weather",
  "news",
];

export function shouldSearch(text: string): boolean {
  const lower = text.toLowerCase();
  return text.includes("?") || SEARCH_TRIGGERS.some((trigger) => lower.includes(trigger));
}

async function gatherContext(ws: WebSocketSender, event: ChatTurnEvent): Promise<string> {
  if (!event.allow_search || !shouldSearch(event.text)) return "";

  sendServerMessage(ws, {
    type: "status_update",
    payload: { status: "searching", detail: `Searching for: ${event.text.slice(0, 30)}...` },
  });

  return formatSearchResults(await searchWeb(event.text));
}

export async function handleChatTurn(
  ws: WebSocketSender,
  event: ChatTurnEvent,
  signal: AbortSignal,
): Promise<void> {
  const characterId = event.character_id;
  const userText = event.text;
  const { spoken, influences } = splitInfluence(userText);
  if (signal.aborted) return;

  const injectedContext = await gatherContext(ws, { ...event, text: spoken });
  if (signal.aborted) return;

  sendServerMessage(ws, { type: "status_update", payload: { status: "thinking" } });

  const card = getCharacterCard(characterId);
  const history = getRecentMessages(characterId)
    .map((entry) => ({
      role: entry.role,
      content:
        entry.role === "user"
          ? stripInfluence(entry.content)
          : forHistory(entry.role, entry.content, entry.imageCaption),
    }))
    .filter((entry) => entry.content.trim().length > 0);

  const reply = await streamReply(
    ws,
    buildChatMessages(card, history, spoken, influences, injectedContext),
    signal,
    history.filter((entry) => entry.role === "assistant").map((entry) => entry.content),
  );

  if (signal.aborted) return;

  appendMessage(characterId, "user", userText);
  const assistantId =
    reply.trim().length > 0 ? appendMessage(characterId, "assistant", reply.trim()) : null;

  const turn: ChatMessage[] = [
    { role: "user", content: spoken },
    { role: "assistant", content: reply },
  ];
  const sceneTurns: ChatMessage[] = [...history, ...turn];

  sendServerMessage(ws, { type: "status_update", payload: { status: "speaking" } });

  // Reply options cost three model calls, and most turns are answered by typing.
  // They are generated when the reader asks for them, not on every turn.
  const [audio, suggestions] = await Promise.all([
    synthesizeSpeech(reply, TTS.voice, signal),
    SUGGESTIONS.autoGenerate
      ? generateReplySuggestions(sceneTurns, { characterName: card.name, tier: card.tier }, signal)
      : Promise.resolve(null),
  ]);

  if (audio) {
    const note = assistantId
      ? await storeVoiceNote(characterId, assistantId, audio)
      : { url: null, durationSeconds: null };
    sendServerMessage(ws, {
      type: "audio_chunk",
      payload: {
        format: "mp3",
        data: note.url ? "" : audio,
        url: note.url ?? undefined,
        duration: note.durationSeconds ?? undefined,
        sentence_index: 0,
      },
    });
  }

  if (suggestions) {
    sendServerMessage(ws, { type: "reply_suggestions", payload: { suggestions } });
  }

  if (signal.aborted) return;

  const previous = getCharacterMind(characterId);
  const appraisal = await appraiseTurn(
    formatScene(turn, card.name),
    card.name,
    previous.score,
    signal,
  );
  const mind = nextMindState(previous.score, appraisal);
  saveCharacterMind(characterId, { score: mind.score, tier: mind.tier, mood: mind.mood });

  sendServerMessage(ws, {
    type: "mind_update",
    payload: {
      affinity_delta: mind.delta,
      current_affinity: mind.score,
      affinity_tier: mind.tier,
      current_mood: mind.mood,
    },
  });

  sendServerMessage(ws, { type: "status_update", payload: { status: "idle" } });
}

export async function handleRegenerateSuggestions(
  ws: WebSocketSender,
  characterId: string,
  signal: AbortSignal,
): Promise<void> {
  const card = getCharacterCard(characterId);
  const recent = getRecentMessages(characterId)
    .slice(-SUGGESTIONS.sceneTurns)
    .map((entry) => ({
      role: entry.role,
      content: forHistory(entry.role, entry.content, entry.imageCaption),
    }))
    .filter((entry) => entry.content.trim().length > 0);

  const suggestions =
    recent.length > 0
      ? await generateReplySuggestions(
          recent,
          { characterName: card.name, tier: card.tier },
          signal,
        )
      : fallbackSuggestions();

  sendServerMessage(ws, { type: "reply_suggestions", payload: { suggestions } });
}
