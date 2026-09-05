import type { ServerMessage } from "@eidolon/protocol";
import { last } from "es-toolkit";
import { create } from "zustand";
import { sendMessage } from "@/services/websocket";
import {
  type ActiveStatus,
  type AudioAttachment,
  attachAudioToLastAssistant,
  audioChunkToAttachment,
  type ChatMessage,
  createMessage,
  findLastAssistantId,
  type MindState,
  resolveUserTimezone,
} from "./chat-messages";
import { appStorage } from "./storage";

export type { ActiveStatus, ChatMessage, MindState } from "./chat-messages";

const HEARTBEAT_DETAIL = "pong";

const SUGGESTIONS_HIDDEN_KEY = "eidolon.chat.suggestions_hidden";

export interface ChatStore {
  activeCharacterId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  streamingIsNarration: boolean;
  activeStatus: ActiveStatus;
  statusDetail: string | null;
  suggestions: string[];
  isSuggestionsLoading: boolean;
  isTrayDismissed: boolean;
  areSuggestionsHidden: boolean;
  inputText: string;
  mind: MindState | null;
  pendingAudio: AudioAttachment | null;
  isSynthesizingAudio: boolean;
  autoPlayMessageId: string | null;
  lastError: string | null;
  setActiveCharacter: (characterId: string) => void;
  dismissSuggestions: () => void;
  revealSuggestions: () => void;
  setSuggestionsHidden: (hidden: boolean) => void;
  setInputText: (text: string) => void;
  sendUserMessage: (text: string, characterId: string) => void;
  handleServerMessage: (msg: ServerMessage) => void;
  rerollSuggestions: (characterId: string) => void;
  selectSuggestion: (suggestion: string) => void;
  interrupt: (characterId: string) => void;
  resetChat: () => void;
  clearAutoPlay: () => void;
  isLoadingHistory: boolean;
}

export const INITIAL_CHAT = {
  activeCharacterId: "",
  messages: [] as ChatMessage[],
  isStreaming: false,
  streamingText: "",
  streamingIsNarration: false,
  activeStatus: "idle" as ActiveStatus,
  statusDetail: null as string | null,
  suggestions: [] as string[],
  isSuggestionsLoading: false,
  isTrayDismissed: false,
  inputText: "",
  mind: null as MindState | null,
  pendingAudio: null as AudioAttachment | null,
  isSynthesizingAudio: false,
  autoPlayMessageId: null as string | null,
  isLoadingHistory: false,
  lastError: null as string | null,
};

export const useChatStore = create<ChatStore>((set, get) => ({
  ...INITIAL_CHAT,

  areSuggestionsHidden: appStorage.getBoolean(SUGGESTIONS_HIDDEN_KEY) ?? false,

  setActiveCharacter: (characterId) => set({ activeCharacterId: characterId }),

  dismissSuggestions: () => set({ isTrayDismissed: true }),

  revealSuggestions: () => set({ isTrayDismissed: false, areSuggestionsHidden: false }),

  setSuggestionsHidden: (hidden) => {
    appStorage.set(SUGGESTIONS_HIDDEN_KEY, hidden);
    set({ areSuggestionsHidden: hidden, isTrayDismissed: hidden });
  },

  setInputText: (text) => set({ inputText: text }),

  sendUserMessage: (text, characterId) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    const message = createMessage({ characterId, role: "user", text: trimmed });
    set((state) => ({
      activeCharacterId: characterId,
      messages: [...state.messages, message],
      inputText: "",
      suggestions: [],
      isSuggestionsLoading: false,
      isTrayDismissed: false,
      isStreaming: true,
      streamingText: "",
      streamingIsNarration: false,
      activeStatus: "thinking",
      statusDetail: null,
      lastError: null,
    }));

    sendMessage({
      type: "chat_turn",
      character_id: characterId,
      text: trimmed,
      allow_search: true,
      user_timezone: resolveUserTimezone(),
    });
  },

  handleServerMessage: (msg) => {
    switch (msg.type) {
      case "text_delta": {
        const token = msg.payload?.token ?? msg.token;
        const isNarration = msg.payload?.is_narration ?? msg.is_narration;
        set((state) => ({
          isStreaming: true,
          streamingText: state.streamingText + token,
          streamingIsNarration: isNarration,
        }));
        break;
      }

      case "reply_suggestions": {
        set((state) => ({
          suggestions: msg.payload?.suggestions ?? msg.suggestions,
          isSuggestionsLoading: false,
          // A reroll the reader asked for keeps the tray open under them.
          // A fresh turn's options arrive collapsed behind the chip.
          isTrayDismissed: state.isSuggestionsLoading ? state.isTrayDismissed : true,
        }));
        break;
      }

      case "mind_update": {
        const source = msg.payload ?? msg;
        set({
          mind: {
            affinity: source.current_affinity,
            affinityDelta: source.affinity_delta,
            tier: source.affinity_tier,
            mood: source.current_mood,
            lastMemory: source.new_memory_logged ?? null,
          },
        });
        break;
      }

      case "audio_chunk": {
        const attachment = audioChunkToAttachment(msg);
        if (!attachment) break;
        set((state) =>
          state.isStreaming
            ? { pendingAudio: attachment, isSynthesizingAudio: false }
            : {
                messages: attachAudioToLastAssistant(state.messages, attachment),
                isSynthesizingAudio: false,
              },
        );
        break;
      }

      case "status_update": {
        const status = msg.payload?.status ?? msg.status;
        const detail = msg.payload?.detail ?? msg.detail ?? null;
        if (detail === HEARTBEAT_DETAIL) break;
        set((state) => ({
          activeStatus: status,
          statusDetail: detail,
          isSynthesizingAudio:
            status === "speaking" ? true : status === "idle" ? false : state.isSynthesizingAudio,
        }));
        if (status === "idle") commitStreamingTurn();
        break;
      }

      case "error": {
        const source = msg.payload ?? msg;
        set({
          isStreaming: false,
          activeStatus: "idle",
          statusDetail: null,
          isSuggestionsLoading: false,
          lastError: source.message,
        });
        break;
      }

      default:
        break;
    }
  },

  rerollSuggestions: (characterId) => {
    const lastMessageId = findLastAssistantId(get().messages) ?? last(get().messages)?.id ?? null;
    if (!lastMessageId) return;

    set({ isSuggestionsLoading: true, isTrayDismissed: false });
    sendMessage({
      type: "regenerate_suggestions",
      character_id: characterId,
      last_message_id: lastMessageId,
    });
  },

  selectSuggestion: (suggestion) => set({ inputText: suggestion, isTrayDismissed: true }),

  interrupt: (characterId) => {
    sendMessage({ type: "interrupt", character_id: characterId });
    set({ isStreaming: false, activeStatus: "idle", statusDetail: null });
  },

  clearAutoPlay: () => set({ autoPlayMessageId: null }),

  resetChat: () => set({ ...INITIAL_CHAT, areSuggestionsHidden: get().areSuggestionsHidden }),
}));

export function commitStreamingTurn(): void {
  const state = useChatStore.getState();
  if (!state.isStreaming && state.streamingText.length === 0) return;

  const text = state.streamingText.trim();
  if (text.length === 0) {
    useChatStore.setState({ isStreaming: false, streamingText: "" });
    return;
  }

  const message = createMessage({
    characterId: state.activeCharacterId,
    role: "assistant",
    text,
    isNarration: state.streamingIsNarration,
    audioUrl: state.pendingAudio?.audioUrl ?? null,
    audioDuration: state.pendingAudio?.audioDuration ?? null,
  });

  useChatStore.setState((current) => ({
    messages: [...current.messages, message],
    isStreaming: false,
    streamingText: "",
    streamingIsNarration: false,
    pendingAudio: null,
    isSynthesizingAudio: false,
    autoPlayMessageId: message.audioUrl ? message.id : current.autoPlayMessageId,
  }));
}
