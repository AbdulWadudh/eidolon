import { characterMemoryUrl, characterMessagesUrl, TIMEOUTS_MS } from "@eidolon/config";
import { formatClockTime } from "@/lib/format";
import type { ChatMessage, MindState } from "./chat-messages";
import type { AvatarCropRect, CharacterLook } from "./chat-photos";

interface TranscriptRow {
  id: string;
  role: string;
  content: string;
  audioUrl?: string | null;
  audioDuration?: number | null;
  imageUrl?: string | null;
  createdAt: number;
}

interface TranscriptResponse {
  character?: {
    name?: string;
    score?: number;
    tier?: string;
    mood?: string;
    avatarUrl?: string | null;
    avatarCrop?: AvatarCropRect | null;
    backgroundUrl?: string | null;
  };
  messages?: TranscriptRow[];
}

export interface Transcript {
  messages: ChatMessage[];
  mind: MindState | null;
  look: CharacterLook;
}

function toMessage(row: TranscriptRow, characterId: string): ChatMessage {
  return {
    id: row.id,
    characterId,
    role: row.role === "user" ? "user" : "assistant",
    text: row.content,
    isNarration: false,
    audioUrl: row.audioUrl ?? null,
    audioDuration: row.audioDuration ?? null,
    imageUrl: row.imageUrl ?? null,
    timestamp: formatClockTime(new Date(row.createdAt)),
  };
}

// Crops written before the format changed carry zoom and offsets rather than a
// region, and reading them would put the avatar somewhere arbitrary. They are
// dropped, which falls back to filling the circle.
function usableCrop(crop: AvatarCropRect | null | undefined): AvatarCropRect | null {
  if (!crop || typeof crop.widthRatio !== "number" || typeof crop.heightRatio !== "number") {
    return null;
  }
  return crop;
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
    look: {
      avatarUrl: body.character?.avatarUrl ?? null,
      avatarCrop: usableCrop(body.character?.avatarCrop),
      backgroundUrl: body.character?.backgroundUrl ?? null,
    },
  };
}

export async function forgetCharacter(host: string, characterId: string): Promise<Transcript> {
  const body = await requestJson(characterMemoryUrl(host, characterId), "DELETE");
  return {
    messages: (body.messages ?? []).map((row) => toMessage(row, characterId)),
    mind: toMind(body.character),
    look: {
      avatarUrl: body.character?.avatarUrl ?? null,
      avatarCrop: usableCrop(body.character?.avatarCrop),
      backgroundUrl: body.character?.backgroundUrl ?? null,
    },
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
