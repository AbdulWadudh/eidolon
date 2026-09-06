import type { AudioChunkEvent } from "@eidolon/protocol";
import { formatClockTime } from "@/lib/format";
import { isNarrationOnly } from "@/lib/roleplay";

export type ChatRole = "user" | "assistant";

export type ActiveStatus = "idle" | "thinking" | "searching" | "painting" | "speaking";

export interface ChatMessage {
  id: string;
  characterId: string;
  role: ChatRole;
  text: string;
  isNarration: boolean;
  audioUrl: string | null;
  audioDuration: number | null;
  imageUrl: string | null;
  timestamp: string;
}

export interface MindState {
  affinity: number;
  affinityDelta: number;
  tier: string;
  mood: string;
  lastMemory: string | null;
}

export interface NewMessage {
  characterId: string;
  role: ChatRole;
  text: string;
  isNarration?: boolean;
  audioUrl?: string | null;
  audioDuration?: number | null;
  imageUrl?: string | null;
}

let sequence = 0;

export function createMessageId(role: ChatRole): string {
  sequence += 1;
  return `${role}-${Date.now().toString(36)}-${sequence}`;
}

const PHOTO_MARKER = /^\*sends a photo(?: of [^*]+)?\*$/i;

export function visibleText(message: { text: string; imageUrl: string | null }): string {
  const text = message.text.trim();
  if (text.length === 0) return "";
  return message.imageUrl && PHOTO_MARKER.test(text) ? "" : text;
}

export function createMessage(input: NewMessage): ChatMessage {
  return {
    id: createMessageId(input.role),
    characterId: input.characterId,
    role: input.role,
    text: input.text,
    isNarration: input.isNarration ?? isNarrationOnly(input.text),
    audioUrl: input.audioUrl ?? null,
    audioDuration: input.audioDuration ?? null,
    imageUrl: input.imageUrl ?? null,
    timestamp: formatClockTime(),
  };
}

export interface AudioAttachment {
  audioUrl: string;
  audioDuration: number | null;
}

const PCM_SAMPLE_RATE = 16000;
const PCM_BYTES_PER_SAMPLE = 2;
const BASE64_BYTES_PER_CHAR = 3 / 4;

export function isLiveSentence(event: AudioChunkEvent): boolean {
  return (event.payload?.live ?? event.live) === true;
}

export function audioChunkToAttachment(event: AudioChunkEvent): AudioAttachment | null {
  const data = event.payload?.data ?? event.data;
  const format = event.payload?.format ?? event.format;
  const url = event.payload?.url ?? event.url;
  const duration = event.payload?.duration ?? event.duration ?? null;
  if (url) return { audioUrl: url, audioDuration: duration };
  if (!data) return null;

  if (format === "mp3") {
    return { audioUrl: `data:audio/mpeg;base64,${data}`, audioDuration: duration };
  }

  const bytes = Math.floor(data.length * BASE64_BYTES_PER_CHAR);
  const seconds = bytes / (PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE);
  return { audioUrl: "", audioDuration: Number(seconds.toFixed(2)) };
}

export function attachAudioToLastAssistant(
  messages: ChatMessage[],
  attachment: AudioAttachment,
): ChatMessage[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const next = messages.slice();
    next[index] = {
      ...message,
      audioUrl: attachment.audioUrl || message.audioUrl,
      audioDuration: attachment.audioDuration ?? message.audioDuration,
    };
    return next;
  }
  return messages;
}

export function findLastAssistantId(messages: ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") return messages[index].id;
  }
  return null;
}

export function resolveUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
