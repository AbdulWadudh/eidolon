import type { ServerMessage } from "@eidolon/protocol";
import type { ActiveStatus, AudioAttachment, ChatMessage, MindState } from "./chat-messages";
import type { CharacterLook, PhotoOrientation } from "./chat-photos";

export const SENT_A_PHOTO = "*sends a photo*";
export const HEARTBEAT_DETAIL = "pong";

export type ChatSetter = (
  partial: Partial<ChatStore> | ((state: ChatStore) => Partial<ChatStore>),
) => void;

export interface ReplyOptions {
  messageId: string;
  options: string[];
}

export interface MoodOverride {
  mood: string;
  hold: boolean;
}

export interface ChatStore {
  activeCharacterId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  streamingReasoning: string;
  streamingIsNarration: boolean;
  activeStatus: ActiveStatus;
  statusDetail: string | null;
  suggestions: string[];
  isSuggestionsLoading: boolean;
  isTrayOpen: boolean;
  areSuggestionsHidden: boolean;
  inputText: string;
  moodOverride: MoodOverride | null;
  thinkNext: boolean;
  replyOptions: ReplyOptions | null;
  isRegenerating: boolean;
  pendingAssistantId: string | null;
  pendingReasoning: string | null;
  /** Set when a character someone else owns has been copied for this user mid-conversation. */
  forkedTo: string | null;
  /** Null until the server says; false while only browsing a character someone else owns. */
  canReply: boolean | null;
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
  setMoodOverride: (override: MoodOverride | null) => void;
  toggleThinkNext: () => void;
  sendUserMessage: (text: string, characterId: string) => void;
  requestImage: (
    characterId: string,
    prompt?: string,
    orientation?: PhotoOrientation,
    referenceUrl?: string | null,
  ) => void;
  requestPhotoIdeas: (characterId: string, isEditing?: boolean) => void;
  isPainting: boolean;
  paintingStep: number;
  paintingTotal: number;
  photoIdeas: string[];
  arrivedAt: string | null;
  personaUpdate: { id: string; photoUrl: string | null } | null;
  areIdeasLoading: boolean;
  characterLook: CharacterLook;
  handleServerMessage: (msg: ServerMessage) => void;
  rerollSuggestions: (characterId: string) => void;
  selectSuggestion: (suggestion: string) => void;
  enhanceInput: (characterId: string) => void;
  clearArrival: () => void;
  clearPersonaUpdate: () => void;
  sendVoiceNote: (characterId: string, base64: string, format: string) => void;
  revertEnhance: () => void;
  interrupt: (characterId: string) => void;
  regenerateReply: (characterId: string) => void;
  requestReplyOptions: (characterId: string) => void;
  clearReplyOptions: () => void;
  editMessage: (messageId: string, text: string) => void;
  refreshAudio: (messageId: string) => void;
  resetChat: () => void;
  clearAutoPlay: () => void;
  focusMessage: (messageId: string) => void;
  clearFocus: () => void;
  isLoadingHistory: boolean;
}
