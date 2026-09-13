import { type ClientMessage, parseClientMessage } from "@eidolon/protocol";
import type { WSMessageReceive } from "hono/ws";
import { handleChatTurn, handleRegenerateSuggestions } from "@/ws/chat-turn";
import { handleEnhanceMessage } from "@/ws/enhance-turn";
import { handleImageRequest, handlePhotoIdeas } from "@/ws/image-turn";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";
import { handleRegenerateReply, handleReplyVariants } from "@/ws/regenerate";
import { bindCharacter } from "@/ws/registry";
import { handleResynthesizeAudio } from "@/ws/resynthesize";
import { handleVoiceInput } from "@/ws/voice-input";
export class ClientSessionManager {
  private abortControllers = new Map<WebSocketSender, AbortController>();

  getAbortSignal(ws: WebSocketSender): AbortSignal {
    this.abortOngoing(ws);
    const controller = new AbortController();
    this.abortControllers.set(ws, controller);
    return controller.signal;
  }

  abortOngoing(ws: WebSocketSender): void {
    const existing = this.abortControllers.get(ws);
    if (existing) {
      existing.abort();
      this.abortControllers.delete(ws);
    }
  }

  cleanup(ws: WebSocketSender): void {
    this.abortOngoing(ws);
  }
}

export const sessionManager = new ClientSessionManager();

export { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

export async function handleClientMessage(
  ws: WebSocketSender,
  rawMessage: WSMessageReceive,
  userId: string,
): Promise<void> {
  const rawString =
    typeof rawMessage === "string"
      ? rawMessage
      : new TextDecoder().decode(rawMessage as ArrayBuffer);

  let clientMsg: ClientMessage;
  try {
    clientMsg = parseClientMessage(rawString);
  } catch (err) {
    sendServerMessage(ws, {
      type: "error",
      payload: {
        code: "INVALID_MESSAGE",
        message: err instanceof Error ? err.message : "Malformed message",
      },
    });
    return;
  }

  if ("character_id" in clientMsg && typeof clientMsg.character_id === "string") {
    bindCharacter(ws, clientMsg.character_id);
  }

  switch (clientMsg.type) {
    case "ping": {
      sendServerMessage(ws, {
        type: "status_update",
        payload: {
          status: "idle",
          detail: "pong",
        },
      });
      break;
    }

    case "interrupt": {
      sessionManager.abortOngoing(ws);
      sendServerMessage(ws, {
        type: "status_update",
        payload: {
          status: "idle",
          detail: "interrupted",
        },
      });
      break;
    }

    case "chat_turn": {
      await handleChatTurn(ws, userId, clientMsg, sessionManager.getAbortSignal(ws));
      break;
    }

    case "resynthesize_audio": {
      await handleResynthesizeAudio(ws, clientMsg, sessionManager.getAbortSignal(ws));
      break;
    }

    case "reply_variants": {
      await handleReplyVariants(ws, userId, clientMsg, sessionManager.getAbortSignal(ws));
      break;
    }

    case "regenerate_reply": {
      await handleRegenerateReply(ws, userId, clientMsg, sessionManager.getAbortSignal(ws));
      break;
    }

    case "regenerate_suggestions": {
      await handleRegenerateSuggestions(
        ws,
        userId,
        clientMsg.character_id,
        sessionManager.getAbortSignal(ws),
      );
      break;
    }

    case "request_image": {
      await handleImageRequest(
        ws,
        userId,
        clientMsg.character_id,
        clientMsg.prompt_override,
        clientMsg.orientation,
        clientMsg.reference_url,
      );
      break;
    }

    case "enhance_message": {
      await handleEnhanceMessage(ws, clientMsg.text, clientMsg.character_id, userId);
      break;
    }

    case "voice_input": {
      await handleVoiceInput(ws, userId, clientMsg, sessionManager.getAbortSignal(ws));
      break;
    }

    case "request_photo_ideas": {
      await handlePhotoIdeas(
        ws,
        userId,
        clientMsg.character_id,
        clientMsg.editing === true,
        sessionManager.getAbortSignal(ws),
      );
      break;
    }
  }
}
