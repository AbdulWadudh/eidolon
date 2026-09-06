import { last } from "es-toolkit";
import { create } from "zustand";
import { sendMessage } from "@/services/websocket";
import { useAffinityStore } from "@/store/affinity-store";
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
  enhanceHistory: [] as string[],
  isEnhancing: false,
  mind: null as MindState | null,
  pendingAudio: null as AudioAttachment | null,
  isSynthesizingAudio: false,
  isPainting: false,
  paintingStep: 0,
  paintingTotal: 0,
  photoIdeas: [] as string[],
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

  /**
   * Who the store is holding, and therefore what it is holding.
   *
   * These two used to be able to disagree. The socket hook set the id on mount
   * while the conversation still belonged to whoever was open before, and
   * `loadHistory` then read "same character" and kept the longer of the two
   * lists — the old one. The screen filters by id, so those messages vanished
   * and the reader was told the stage was set on a chat they had been having
   * for a week. It only happened when the character they came from had more
   * messages than the one they opened, which is what made it look random.
   */
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

  enhanceInput: (characterId) => {
    const draft = get().inputText;
    if (draft.trim().length === 0 || get().isEnhancing) return;

    // The draft is banked before the request leaves, so revert has something to
    // return to whatever the conductor says next.
    set((state) => ({
      isEnhancing: true,
      enhanceHistory: [...state.enhanceHistory, draft],
    }));

    sendMessage({ type: "enhance_message", character_id: characterId, text: draft });
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

    const message = createMessage({ characterId, role: "user", text: trimmed });
    set((state) => ({
      activeCharacterId: characterId,
      messages: [...state.messages, message],
      inputText: "",
      enhanceHistory: [],
      isEnhancing: false,
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
      allow_search: useAffinityStore.getState().allowWebSearch,
      user_timezone: resolveUserTimezone(),
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

  selectSuggestion: (suggestion) =>
    set({ inputText: suggestion, isTrayOpen: false, enhanceHistory: [], isEnhancing: false }),

  interrupt: (characterId) => {
    sendMessage({ type: "interrupt", character_id: characterId });
    set({ isStreaming: false, activeStatus: "idle", statusDetail: null });
  },

  clearAutoPlay: () => set({ autoPlayMessageId: null }),

  // Set from the gallery, read once by the feed, then cleared. Opening a photo
  // from her profile has to land on the message it belongs to, not the tail.
  focusMessage: (messageId) => set({ focusMessageId: messageId }),

  clearFocus: () => set({ focusMessageId: null }),

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
