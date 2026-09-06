import type { ServerMessage } from "@eidolon/protocol";
import { attachAudioToLastAssistant, audioChunkToAttachment, createMessage } from "./chat-messages";
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
        paintingPreview: null,
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
}
