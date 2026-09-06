import type { ActiveStatus, ChatMessage, MindState } from "./chat-messages";
import type { CharacterLook } from "./chat-photos";
import type { ChatStore } from "./chat-store";

const NO_MESSAGES: ChatMessage[] = [];
const NO_SUGGESTIONS: string[] = [];

export const EMPTY_LOOK: CharacterLook = {
  avatarUrl: null,
  avatarCrop: null,
  backgroundUrl: null,
  faceUrl: null,
};

export interface ChatView {
  isShowing: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  streamingIsNarration: boolean;
  activeStatus: ActiveStatus;
  statusDetail: string | null;
  suggestions: string[];
  isSuggestionsLoading: boolean;
  isTrayOpen: boolean;
  inputText: string;
  mind: MindState | null;
  characterLook: CharacterLook;
  isSynthesizingAudio: boolean;
  isPainting: boolean;
  paintingStep: number;
  paintingTotal: number;
  photoIdeas: string[];
  areIdeasLoading: boolean;
  autoPlayMessageId: string | null;
  focusMessageId: string | null;
  isLoadingHistory: boolean;
  loadError: string | null;
  isEnhancing: boolean;
  revertSteps: number;
}

/**
 * There is one chat store and, thanks to `router.push`, more than one chat
 * screen alive at a time. The screen you left is still mounted and still
 * subscribed, so without this it re-renders with whoever was opened after it —
 * which is how every character came to show the same conversation.
 *
 * A screen sees the store only while the store is holding its character.
 * Messages are additionally filtered by the id they were stored with, so a turn
 * that arrives for someone else can never land in this transcript.
 */
export function projectChat(state: ChatStore, characterId: string): ChatView {
  const isShowing = state.activeCharacterId === characterId;

  if (!isShowing) {
    return {
      isShowing: false,
      messages: NO_MESSAGES,
      isStreaming: false,
      streamingText: "",
      streamingIsNarration: false,
      activeStatus: "idle",
      statusDetail: null,
      suggestions: NO_SUGGESTIONS,
      isSuggestionsLoading: false,
      isTrayOpen: false,
      inputText: "",
      mind: null,
      characterLook: EMPTY_LOOK,
      isSynthesizingAudio: false,
      isPainting: false,
      paintingStep: 0,
      paintingTotal: 0,
      photoIdeas: NO_SUGGESTIONS,
      areIdeasLoading: false,
      autoPlayMessageId: null,
      focusMessageId: null,
      isLoadingHistory: true,
      loadError: null,
      isEnhancing: false,
      revertSteps: 0,
    };
  }

  return {
    isShowing: true,
    messages: state.messages.filter((message) => message.characterId === characterId),
    isStreaming: state.isStreaming,
    streamingText: state.streamingText,
    streamingIsNarration: state.streamingIsNarration,
    activeStatus: state.activeStatus,
    statusDetail: state.statusDetail,
    suggestions: state.suggestions,
    isSuggestionsLoading: state.isSuggestionsLoading,
    isTrayOpen: state.isTrayOpen,
    inputText: state.inputText,
    mind: state.mind,
    characterLook: state.characterLook,
    isSynthesizingAudio: state.isSynthesizingAudio,
    isPainting: state.isPainting,
    paintingStep: state.paintingStep,
    paintingTotal: state.paintingTotal,
    photoIdeas: state.photoIdeas,
    areIdeasLoading: state.areIdeasLoading,
    autoPlayMessageId: state.autoPlayMessageId,
    focusMessageId: state.focusMessageId,
    isLoadingHistory: state.isLoadingHistory,
    loadError: state.lastError,
    isEnhancing: state.isEnhancing,
    revertSteps: state.enhanceHistory.length,
  };
}
