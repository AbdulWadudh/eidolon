import {
  characterMemoryUrl,
  characterMessagesUrl,
  characterStartUrl,
  TIMEOUTS_MS,
} from "@eidolon/config";
import { formatClockTime } from "@/lib/format";
import { authedFetch } from "@/store/connection";
import type { ChatMessage, MindState } from "./chat-messages";
import type { AvatarCropRect, CharacterLook } from "./chat-photos";

interface TranscriptRow {
  id: string;
  role: string;
  content: string;
  audioUrl?: string | null;
  audioDuration?: number | null;
  imageUrl?: string | null;
  reasoning?: string | null;
  createdAt: number;
}

interface TranscriptResponse {
  character?: {
    id?: string;
    canReply?: boolean;
    name?: string;
    score?: number;
    tier?: string;
    mood?: string;
    avatarUrl?: string | null;
    avatarCrop?: AvatarCropRect | null;
    backgroundUrl?: string | null;
    faceUrl?: string | null;
  };
  messages?: TranscriptRow[];
}

export interface Transcript {
  /** The character this user actually talks to — their own copy, when the one asked for is someone else's. */
  characterId: string;
  /** False while only browsing a character someone else owns. */
  canReply: boolean;
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
    reasoning: row.reasoning ?? null,
    timestamp: formatClockTime(new Date(row.createdAt)),
  };
}

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

  // The server hands back the character this user actually talks to, which is a copy
  // of their own when the one they asked for belongs to somebody else.
  const mine = typeof body.character?.id === "string" ? body.character.id : characterId;
  return {
    characterId: mine,
    canReply: body.character?.canReply !== false,
    messages: (body.messages ?? []).map((row) => toMessage(row, mine)),
    mind: toMind(body.character),
    look: {
      avatarUrl: body.character?.avatarUrl ?? null,
      avatarCrop: usableCrop(body.character?.avatarCrop),
      backgroundUrl: body.character?.backgroundUrl ?? null,
      faceUrl: body.character?.faceUrl ?? null,
      outfit: null,
    },
  };
}

export async function forgetCharacter(host: string, characterId: string): Promise<Transcript> {
  const body = await requestJson(characterMemoryUrl(host, characterId), "DELETE");
  return {
    characterId,
    canReply: true,
    messages: (body.messages ?? []).map((row) => toMessage(row, characterId)),
    mind: toMind(body.character),
    look: {
      avatarUrl: body.character?.avatarUrl ?? null,
      avatarCrop: usableCrop(body.character?.avatarCrop),
      backgroundUrl: body.character?.backgroundUrl ?? null,
      faceUrl: body.character?.faceUrl ?? null,
      outfit: null,
    },
  };
}

async function requestJson(url: string, method: "GET" | "DELETE"): Promise<TranscriptResponse> {
  const response = await authedFetch(url, {
    method,
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUTS_MS.transcript),
  });

  if (!response.ok) throw new Error(`Conductor returned HTTP ${response.status}.`);
  return (await response.json()) as TranscriptResponse;
}

export async function startConversation(host: string, characterId: string): Promise<string> {
  const res = await authedFetch(characterStartUrl(host, characterId), {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
  });

  if (!res.ok) return characterId;

  const body = (await res.json()) as { characterId?: string };
  return typeof body.characterId === "string" ? body.characterId : characterId;
}
