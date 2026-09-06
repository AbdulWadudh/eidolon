import { CALL } from "@eidolon/config";
import type { AudioChunkEvent, ServerMessage } from "@eidolon/protocol";
import { create } from "zustand";
import { sendMessage } from "@/services/websocket";

export type CallPhase = "connecting" | "listening" | "thinking" | "speaking" | "ended";

export interface SpokenChunk {
  index: number;
  url: string;
  data: string;
  text: string;
  key: string;
}

export interface CallStore {
  characterId: string;
  phase: CallPhase;
  startedAt: number | null;
  isMuted: boolean;
  isSpeakerOn: boolean;
  subtitle: string;
  queue: SpokenChunk[];
  playedIndex: number;
  turnKey: string;
  heard: string;
  setHeard: (text: string) => void;
  beginTurn: () => void;
  open: (characterId: string) => void;
  close: () => void;
  handleServerMessage: (message: ServerMessage) => void;
  consume: () => SpokenChunk | null;
  finishedSpeaking: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  interrupt: () => void;
}

const IDLE = {
  phase: "connecting" as CallPhase,
  startedAt: null as number | null,
  subtitle: "",
  queue: [] as SpokenChunk[],
  playedIndex: -1,
  turnKey: "0",
  heard: "",
};

export function appendSpoken(spoken: string, sentence: string): string {
  const next = sentence.trim();
  if (next.length === 0) return spoken;
  return spoken.length === 0 ? next : `${spoken} ${next}`;
}

export function liveChunk(message: AudioChunkEvent, turnKey: string): SpokenChunk | null {
  const source = message.payload ?? message;
  if (source.live !== true) return null;

  const data = source.data ?? "";
  const url = source.url ?? "";
  if (url.length === 0 && data.length === 0) return null;

  return {
    index: source.sentence_index,
    url,
    data,
    text: (source.text ?? "").trim(),
    key: `${turnKey}-${source.sentence_index}`,
  };
}

export const useCallStore = create<CallStore>((set, get) => ({
  ...IDLE,
  characterId: "",
  isMuted: false,
  isSpeakerOn: true,

  open: (characterId) => set({ ...IDLE, characterId, phase: "listening", startedAt: Date.now() }),

  close: () => set({ ...IDLE, phase: "ended", characterId: "" }),

  handleServerMessage: (message) => {
    if (get().characterId.length === 0) return;

    if (message.type === "audio_chunk") {
      const chunk = liveChunk(message, get().turnKey);
      if (!chunk) return;
      set((state) => ({
        phase: "speaking",
        subtitle: appendSpoken(state.subtitle, chunk.text),
        queue: [...state.queue, chunk].slice(-CALL.queueLimit),
      }));
      return;
    }

    if (message.type === "status_update") {
      const status = message.payload?.status ?? message.status;
      if (status === "thinking" || status === "searching") set({ phase: "thinking" });
      if (status === "idle") {
        set((state) => ({ phase: state.queue.length > 0 ? "speaking" : "listening" }));
      }
      return;
    }

    if (message.type === "error") {
      set({ phase: "listening", queue: [] });
    }
  },

  consume: () => {
    const next = get().queue[0];
    if (!next) return null;
    set((state) => ({ queue: state.queue.slice(1), playedIndex: next.index }));
    return next;
  },

  finishedSpeaking: () =>
    set((state) => ({ phase: state.queue.length > 0 ? "speaking" : "listening" })),

  setHeard: (text) => set({ heard: text }),

  beginTurn: () =>
    set((state) => ({
      heard: "",
      subtitle: "",
      queue: [],
      turnKey: String(Number(state.turnKey) + 1),
    })),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleSpeaker: () => set((state) => ({ isSpeakerOn: !state.isSpeakerOn })),

  interrupt: () => {
    const characterId = get().characterId;
    if (characterId.length === 0) return;
    sendMessage({ type: "interrupt", character_id: characterId });
    set((state) => ({
      phase: "listening",
      queue: [],
      subtitle: "",
      heard: "",
      turnKey: String(Number(state.turnKey) + 1),
    }));
  },
}));

export function isCallLive(characterId: string): boolean {
  const state = useCallStore.getState();
  return state.characterId === characterId && state.phase !== "ended";
}

export function callElapsedSeconds(startedAt: number | null, now: number): number {
  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}
