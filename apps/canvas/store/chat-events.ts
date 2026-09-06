import type { ServerMessage } from "@eidolon/protocol";
import {
  attachAudioToLastAssistant,
  audioChunkToAttachment,
  createMessage,
  isLiveSentence,
} from "./chat-messages";
import { type ChatSetter, HEARTBEAT_DETAIL } from "./chat-types";

// The commit is handed in rather than imported: reading it from the store here
// would close a require cycle, and Metro warns that the value can be
// uninitialised when it does.
export function reduceServerMessage(
  msg: ServerMessage,
  set: ChatSetter,
  commitStreamingTurn: () => void,
): void {
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
        // Anything else arrives folded away behind the chip.
        isTrayOpen: state.isSuggestionsLoading ? state.isTrayOpen : false,
      }));
      break;
    }

    case "image_preview": {
      const source = msg.payload ?? msg;

      set({
        paintingStep: source.step ?? 0,
        paintingTotal: source.total_steps ?? 0,
      });
      break;
    }

    case "photo_ideas": {
      set({ photoIdeas: msg.payload?.ideas ?? msg.ideas, areIdeasLoading: false });
      break;
    }

    case "image_failed": {
      const source = msg.payload ?? msg;
      set({
        isPainting: false,
        paintingStep: 0,
        paintingTotal: 0,
        lastError: source.reason,
      });
      break;
    }

    case "image_ready": {
      const source = msg.payload ?? msg;
      set((state) => ({
        isPainting: false,
        paintingStep: 0,
        paintingTotal: 0,
        messages: [
          ...state.messages,
          createMessage({
            characterId: state.activeCharacterId,
            role: "assistant",
            text: source.caption ?? "",
            imageUrl: source.image_url,
          }),
        ],
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
      if (isLiveSentence(msg)) break;
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

    case "message_enhanced": {
      const source = msg.payload ?? msg;
      set({ inputText: source.text, isEnhancing: false });
      break;
    }

    case "transcript": {
      const source = msg.payload ?? msg;
      const heard = source.text.trim();
      if (!source.is_final || heard.length === 0) break;
      set((state) => ({
        messages: [
          ...state.messages,
          createMessage({ characterId: state.activeCharacterId, role: "user", text: heard }),
        ],
      }));
      break;
    }

    case "error": {
      const source = msg.payload ?? msg;
      const failedToEnhance = source.code === "ENHANCE_FAILED";

      set((state) => ({
        isStreaming: failedToEnhance ? state.isStreaming : false,
        activeStatus: failedToEnhance ? state.activeStatus : "idle",
        statusDetail: failedToEnhance ? state.statusDetail : null,
        isSuggestionsLoading: failedToEnhance ? state.isSuggestionsLoading : false,
        isEnhancing: false,
        // A rework that never landed must not leave a step on the stack, or
        // revert would appear to do nothing the first time it is pressed.
        enhanceHistory: failedToEnhance ? state.enhanceHistory.slice(0, -1) : state.enhanceHistory,
        lastError: source.message,
      }));
      break;
    }

    default:
      break;
  }
}
