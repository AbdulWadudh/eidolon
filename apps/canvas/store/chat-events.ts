import { MOMENT_COPY } from "@eidolon/config";
import type { ServerMessage } from "@eidolon/protocol";
import {
  attachAudioToLastAssistant,
  attachAudioToMessage,
  audioChunkToAttachment,
  createMessage,
  isLiveSentence,
} from "./chat-messages";
import { type ChatSetter, HEARTBEAT_DETAIL } from "./chat-types";
import { useToastStore } from "./toast-store";

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
      set({
        suggestions: msg.payload?.suggestions ?? msg.suggestions,
        isSuggestionsLoading: false,
      });
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

    case "stage_shift": {
      const source = msg.payload ?? msg;
      const repaints =
        source.replaces_background !== false &&
        typeof source.backdrop_url === "string" &&
        source.backdrop_url.length > 0;

      if (repaints) {
        set((state) => ({
          characterLook: { ...state.characterLook, backgroundUrl: source.backdrop_url },
        }));
      }

      if (typeof source.location_name === "string" && source.location_name.length > 0) {
        useToastStore
          .getState()
          .notify(
            repaints
              ? `${MOMENT_COPY.arrived} ${source.location_name}`
              : `${MOMENT_COPY.arrived} ${source.location_name} — ${MOMENT_COPY.keptYourBackground}`,
            "good",
          );
      }
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

      const target = msg.payload?.message_id ?? msg.message_id;
      if (target) {
        set((state) => ({
          messages: attachAudioToMessage(state.messages, target, attachment),
          isSynthesizingAudio: false,
          autoPlayMessageId: attachment.audioUrl ? target : state.autoPlayMessageId,
        }));
        break;
      }

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

    case "message_committed": {
      set({ pendingAssistantId: msg.payload.message_id });
      break;
    }

    case "reply_options": {
      set({
        replyOptions: { messageId: msg.payload.message_id, options: msg.payload.options },
        isRegenerating: false,
      });
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
        enhanceHistory: failedToEnhance ? state.enhanceHistory.slice(0, -1) : state.enhanceHistory,
        isRegenerating: false,
        isSynthesizingAudio: false,
        lastError: source.message,
      }));

      if (typeof source.message === "string" && source.message.length > 0) {
        useToastStore.getState().notify(source.message, "bad");
      }
      break;
    }

    default:
      break;
  }
}
