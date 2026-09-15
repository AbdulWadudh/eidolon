import { last } from "es-toolkit";
import { create } from "zustand";
import { sendMessage } from "@/services/websocket";
import { useAffinityStore } from "@/store/affinity-store";
import { isCallLive } from "@/store/call-store";
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
import type { ChatStore, ReplyOptions } from "./chat-types";
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
  streamingReasoning: "",
  streamingIsNarration: false,
  activeStatus: "idle" as ActiveStatus,
  statusDetail: null as string | null,
  suggestions: [] as string[],
  isSuggestionsLoading: false,
  isTrayOpen: false,
  inputText: "",
  moodOverride: null,
  thinkNext: false,
  replyOptions: null as ReplyOptions | null,
  isRegenerating: false,
  pendingAssistantId: null as string | null,
  pendingReasoning: null as string | null,
  pendingText: null as string | null,
  forkedTo: null as string | null,
  canReply: null as boolean | null,
  enhanceHistory: [] as string[],
  isEnhancing: false,
  mind: null as MindState | null,
  pendingAudio: null as AudioAttachment | null,
  isSynthesizingAudio: false,
  isPainting: false,
  paintingStep: 0,
  paintingTotal: 0,
  photoIdeas: [] as string[],
  arrivedAt: null as string | null,
  personaUpdate: null as { id: string; photoUrl: string | null } | null,
  areIdeasLoading: false,
  characterLook: {
    avatarUrl: null,
    avatarCrop: null,
    backgroundUrl: null,
    faceUrl: null,
  } as CharacterLook,
  autoPlayMessageId: null as string | null,
  focusMessageId: null as string | null,
  isLoadingHistory: false,
  lastError: null as string | null,
};

export const useChatStore = create<ChatStore>((set, get) => ({
  ...INITIAL_CHAT,

  areSuggestionsHidden: appStorage.getBoolean(SUGGESTIONS_HIDDEN_KEY) ?? false,

  setActiveCharacter: (characterId) =>
    set((state) =>
      state.activeCharacterId === characterId
        ? state
        : {
            ...INITIAL_CHAT,
            areSuggestionsHidden: state.areSuggestionsHidden,
            activeCharacterId: characterId,
            isLoadingHistory: true,
          },
    ),

  dismissSuggestions: () => set({ isTrayOpen: false }),

  revealSuggestions: () => set({ isTrayOpen: true, areSuggestionsHidden: false }),

  setSuggestionsHidden: (hidden) => {
    appStorage.set(SUGGESTIONS_HIDDEN_KEY, hidden);
    set({ areSuggestionsHidden: hidden, isTrayOpen: false });
  },

  setInputText: (text) => set({ inputText: text }),
  setMoodOverride: (override) => set({ moodOverride: override }),

  toggleThinkNext: () => set((state) => ({ thinkNext: !state.thinkNext })),

  enhanceInput: (characterId) => {
    const draft = get().inputText;
    if (draft.trim().length === 0 || get().isEnhancing) return;

    set((state) => ({
      isEnhancing: true,
      enhanceHistory: [...state.enhanceHistory, draft],
    }));

    sendMessage({ type: "enhance_message", character_id: characterId, text: draft });
  },

  sendVoiceNote: (characterId, base64, format) => {
    if (base64.length === 0) return;

    set({ isStreaming: true, activeStatus: "thinking", statusDetail: null });
    sendMessage({
      type: "voice_input",
      character_id: characterId,
      format,
      data: base64,
      allow_search: true,
      user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      live_voice: false,
    });
  },

  revertEnhance: () => {
    const history = get().enhanceHistory;
    const previous = history.at(-1);
    if (previous === undefined) return;

    set({ inputText: previous, enhanceHistory: history.slice(0, -1) });
  },

  sendUserMessage: (text, characterId) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    const override = get().moodOverride;
    const think = get().thinkNext;
    const message = createMessage({ characterId, role: "user", text: trimmed });
    set((state) => ({
      activeCharacterId: characterId,
      messages: [...state.messages, message],
      inputText: "",
      moodOverride: override?.hold ? override : null,
      thinkNext: false,
      enhanceHistory: [],
      isEnhancing: false,
      suggestions: [],
      isSuggestionsLoading: false,
      isTrayOpen: false,
      isStreaming: true,
      streamingText: "",
      streamingReasoning: "",
      streamingIsNarration: false,
      activeStatus: "thinking",
      statusDetail: null,
      lastError: null,
    }));

    sendMessage({
      type: "chat_turn",
      character_id: characterId,
      text: trimmed,
      allow_search: useAffinityStore.getState().allowWebSearch,
      user_timezone: resolveUserTimezone(),
      live_voice: isCallLive(characterId),
      think,
      ...(override ? { mood: override.mood } : {}),
    });
  },

  requestImage: (characterId, prompt, orientation, referenceUrl) => {
    set({
      activeCharacterId: characterId,
      isPainting: true,
      paintingStep: 0,
      paintingTotal: 0,
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

  requestPhotoIdeas: (characterId, isEditing = false) => {
    const shown = get().photoIdeas;
    set({ areIdeasLoading: true, photoIdeas: [] });
    sendMessage({
      type: "request_photo_ideas",
      character_id: characterId,
      editing: isEditing,
      exclude: shown,
    });
  },

  clearArrival: () => set({ arrivedAt: null }),

  clearPersonaUpdate: () => set({ personaUpdate: null }),

  handleServerMessage: (msg) => reduceServerMessage(msg, set, commitStreamingTurn),

  rerollSuggestions: (characterId) => {
    const lastMessageId =
      findLastAssistantId(get().messages) ?? last(get().messages)?.id ?? NEW_CHAT_ANCHOR;

    const shown = get().suggestions;
    set({ isSuggestionsLoading: true, isTrayOpen: true });
    sendMessage({
      type: "regenerate_suggestions",
      character_id: characterId,
      last_message_id: lastMessageId,
      exclude: shown,
    });
  },

  selectSuggestion: (suggestion) =>
    set({ inputText: suggestion, isTrayOpen: false, enhanceHistory: [], isEnhancing: false }),

  requestReplyOptions: (characterId) => {
    const override = get().moodOverride;
    set({ replyOptions: null, isRegenerating: true, lastError: null });
    sendMessage({
      type: "reply_variants",
      character_id: characterId,
      allow_search: useAffinityStore.getState().allowWebSearch,
      user_timezone: resolveUserTimezone(),
      ...(override ? { mood: override.mood } : {}),
    });
  },

  clearReplyOptions: () => set({ replyOptions: null, isRegenerating: false }),

  regenerateReply: (characterId) => {
    const override = get().moodOverride;
    set({
      isStreaming: true,
      streamingText: "",
      streamingReasoning: "",
      streamingIsNarration: false,
      activeStatus: "thinking",
      statusDetail: null,
      lastError: null,
    });
    sendMessage({
      type: "regenerate_reply",
      character_id: characterId,
      allow_search: useAffinityStore.getState().allowWebSearch,
      user_timezone: resolveUserTimezone(),
      ...(override ? { mood: override.mood } : {}),
    });
  },

  editMessage: (messageId, text) =>
    set((state) => ({
      messages: state.messages.map((entry) =>
        entry.id === messageId ? { ...entry, text, audioUrl: null, audioDuration: null } : entry,
      ),
    })),

  refreshAudio: (messageId) => {
    set({ isSynthesizingAudio: true });
    sendMessage({
      type: "resynthesize_audio",
      character_id: get().activeCharacterId,
      message_id: messageId,
    });
  },

  interrupt: (characterId) => {
    sendMessage({ type: "interrupt", character_id: characterId });
    set({ isStreaming: false, activeStatus: "idle", statusDetail: null });
  },

  clearAutoPlay: () => set({ autoPlayMessageId: null }),

  focusMessage: (messageId) => set({ focusMessageId: messageId }),

  clearFocus: () => set({ focusMessageId: null }),

  resetChat: () => set({ ...INITIAL_CHAT, areSuggestionsHidden: get().areSuggestionsHidden }),
}));

export function commitStreamingTurn(): void {
  const state = useChatStore.getState();
  if (!state.isStreaming && state.streamingText.length === 0) return;

  const text = (state.pendingText ?? state.streamingText).trim();
  if (text.length === 0) {
    useChatStore.setState({
      isStreaming: false,
      streamingText: "",
      streamingReasoning: "",
      pendingText: null,
    });
    return;
  }

  const drafted = createMessage({
    characterId: state.activeCharacterId,
    role: "assistant",
    text,
    isNarration: state.streamingIsNarration,
    audioUrl: state.pendingAudio?.audioUrl ?? null,
    audioDuration: state.pendingAudio?.audioDuration ?? null,
    reasoning: state.pendingReasoning ?? (state.streamingReasoning.trim() || null),
  });

  const message = state.pendingAssistantId ? { ...drafted, id: state.pendingAssistantId } : drafted;

  useChatStore.setState((current) => ({
    messages: [...current.messages, message],
    isStreaming: false,
    streamingText: "",
    streamingReasoning: "",
    streamingIsNarration: false,
    pendingAudio: null,
    pendingAssistantId: null,
    pendingReasoning: null,
    pendingText: null,
    isSynthesizingAudio: false,
    autoPlayMessageId:
      message.audioUrl && !isCallLive(current.activeCharacterId)
        ? message.id
        : current.autoPlayMessageId,
  }));
}
