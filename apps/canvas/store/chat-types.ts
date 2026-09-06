import type { ServerMessage } from "@eidolon/protocol";
import type { ActiveStatus, AudioAttachment, ChatMessage, MindState } from "./chat-messages";
import type { CharacterLook, PhotoOrientation } from "./chat-photos";

export const SENT_A_PHOTO = "*sends a photo*";
export const HEARTBEAT_DETAIL = "pong";

export type ChatSetter = (
  partial: Partial<ChatStore> | ((state: ChatStore) => Partial<ChatStore>),
) => void;

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
  isTrayOpen: boolean;
  areSuggestionsHidden: boolean;
  inputText: string;
  enhanceHistory: string[];
  isEnhancing: boolean;
  mind: MindState | null;
  pendingAudio: AudioAttachment | null;
  isSynthesizingAudio: boolean;
  autoPlayMessageId: string | null;
  focusMessageId: string | null;
  lastError: string | null;
  setActiveCharacter: (characterId: string) => void;
  dismissSuggestions: () => void;
  revealSuggestions: () => void;
  setSuggestionsHidden: (hidden: boolean) => void;
  setInputText: (text: string) => void;
  sendUserMessage: (text: string, characterId: string) => void;
  requestImage: (
    characterId: string,
    prompt?: string,
    orientation?: PhotoOrientation,
    referenceUrl?: string | null,
  ) => void;
  requestPhotoIdeas: (characterId: string) => void;
  isPainting: boolean;
  paintingStep: number;
  paintingTotal: number;
  photoIdeas: string[];
  areIdeasLoading: boolean;
  characterLook: CharacterLook;
  handleServerMessage: (msg: ServerMessage) => void;
  rerollSuggestions: (characterId: string) => void;
  selectSuggestion: (suggestion: string) => void;
  enhanceInput: (characterId: string) => void;
  revertEnhance: () => void;
  interrupt: (characterId: string) => void;
  resetChat: () => void;
  clearAutoPlay: () => void;
  focusMessage: (messageId: string) => void;
  clearFocus: () => void;
  isLoadingHistory: boolean;
}
