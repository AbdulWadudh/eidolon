import { characterMemoryUrl, characterMessagesUrl, TIMEOUTS_MS } from "@eidolon/config";
import { formatClockTime } from "@/lib/format";
import type { ChatMessage, MindState } from "./chat-messages";

interface TranscriptRow {
  id: string;
  role: string;
  content: string;
  audioUrl?: string | null;
  createdAt: number;
}

interface TranscriptResponse {
  character?: { name?: string; score?: number; tier?: string; mood?: string };
  messages?: TranscriptRow[];
}

export interface Transcript {
  messages: ChatMessage[];
  mind: MindState | null;
}

function toMessage(row: TranscriptRow, characterId: string): ChatMessage {
  return {
    id: row.id,
    characterId,
    role: row.role === "user" ? "user" : "assistant",
    text: row.content,
    isNarration: false,
    audioUrl: row.audioUrl ?? null,
    audioDuration: null,
    timestamp: formatClockTime(new Date(row.createdAt)),
  };
}

function toMind(character: TranscriptResponse["character"]): MindState | null {
  if (!character || typeof character.score !== "number") return null;
  return {
    affinity: character.score,
    affinityDelta: 0,
    tier: character.tier ?? "",
    mood: character.mood ?? "",
    lastMemory: null,
  };
}

export async function fetchTranscript(host: string, characterId: string): Promise<Transcript> {
  const body = await requestJson(characterMessagesUrl(host, characterId), "GET");
  return {
    messages: (body.messages ?? []).map((row) => toMessage(row, characterId)),
    mind: toMind(body.character),
  };
}

export async function forgetCharacter(host: string, characterId: string): Promise<Transcript> {
  const body = await requestJson(characterMemoryUrl(host, characterId), "DELETE");
  return {
    messages: (body.messages ?? []).map((row) => toMessage(row, characterId)),
    mind: toMind(body.character),
  };
}

async function requestJson(url: string, method: "GET" | "DELETE"): Promise<TranscriptResponse> {
  const response = await fetch(url, {
    method,
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
  });

  if (!response.ok) throw new Error(`Conductor returned HTTP ${response.status}.`);
  return (await response.json()) as TranscriptResponse;
}
