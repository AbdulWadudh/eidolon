import { last } from "es-toolkit";
import { create } from "zustand";
import { sendMessage } from "@/services/websocket";
import { reduceServerMessage } from "./chat-events";
import {
  type ActiveStatus,
  type AudioAttachment,
  type ChatMessage,
  createMessage,
  findLastAssistantId,
  type MindState,
  resolveUserTimezone,
} from "./chat-messages";
import type { CharacterLook } from "./chat-photos";
import type { ChatStore } from "./chat-types";
import { appStorage } from "./storage";

export type { ActiveStatus, ChatMessage, MindState } from "./chat-messages";
export type { ChatStore } from "./chat-types";
export { HEARTBEAT_DETAIL, SENT_A_PHOTO } from "./chat-types";

const SUGGESTIONS_HIDDEN_KEY = "eidolon.chat.suggestions_hidden";

const NEW_CHAT_ANCHOR = "new-chat";

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
  isTrayOpen: false,
  inputText: "",
  mind: null as MindState | null,
  pendingAudio: null as AudioAttachment | null,
  isSynthesizingAudio: false,
  isPainting: false,
  paintingStep: 0,
  paintingTotal: 0,
  paintingPreview: null as string | null,
  photoIdeas: [] as string[],
  areIdeasLoading: false,
  characterLook: {
    avatarUrl: null,
    avatarCrop: null,
    backgroundUrl: null,
    faceUrl: null,
  } as CharacterLook,
  autoPlayMessageId: null as string | null,
  isLoadingHistory: false,
  lastError: null as string | null,
};

export const useChatStore = create<ChatStore>((set, get) => ({
  ...INITIAL_CHAT,

  areSuggestionsHidden: appStorage.getBoolean(SUGGESTIONS_HIDDEN_KEY) ?? false,

  setActiveCharacter: (characterId) => set({ activeCharacterId: characterId }),

  dismissSuggestions: () => set({ isTrayOpen: false }),

  revealSuggestions: () => set({ isTrayOpen: true, areSuggestionsHidden: false }),

  setSuggestionsHidden: (hidden) => {
    appStorage.set(SUGGESTIONS_HIDDEN_KEY, hidden);
    set({ areSuggestionsHidden: hidden, isTrayOpen: false });
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
      isTrayOpen: false,
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

  requestImage: (characterId, prompt, orientation, referenceUrl) => {
    set({
      activeCharacterId: characterId,
      isPainting: true,
      paintingStep: 0,
      paintingTotal: 0,
      paintingPreview: null,
      activeStatus: "painting",
      statusDetail: null,
      lastError: null,
    });
    sendMessage({
      type: "request_image",
      character_id: characterId,
      prompt_override: prompt?.trim() || undefined,
      orientation,
      reference_url: referenceUrl ?? undefined,
    });
  },

  requestPhotoIdeas: (characterId) => {
    set({ areIdeasLoading: true, photoIdeas: [] });
    sendMessage({ type: "request_photo_ideas", character_id: characterId });
  },

  handleServerMessage: (msg) => reduceServerMessage(msg, set, commitStreamingTurn),

  rerollSuggestions: (characterId) => {
    // A fresh chat has nothing to anchor to; the conductor reads its own history
    // anyway, so this only has to satisfy the schema.
    const lastMessageId =
      findLastAssistantId(get().messages) ?? last(get().messages)?.id ?? NEW_CHAT_ANCHOR;

    set({ isSuggestionsLoading: true, isTrayOpen: true });
    sendMessage({
      type: "regenerate_suggestions",
      character_id: characterId,
      last_message_id: lastMessageId,
    });
  },

  selectSuggestion: (suggestion) => set({ inputText: suggestion, isTrayOpen: false }),

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
