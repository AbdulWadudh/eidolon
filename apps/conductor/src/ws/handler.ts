import { type ClientMessage, parseClientMessage } from "@eidolon/protocol";
import type { WSMessageReceive } from "hono/ws";
import { handleChatTurn, handleRegenerateSuggestions } from "@/ws/chat-turn";
import { handleEnhanceMessage } from "@/ws/enhance-turn";
import { handleImageRequest, handlePhotoIdeas } from "@/ws/image-turn";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";
import { bindCharacter } from "@/ws/registry";
/**
 * Manages per-connection streaming tasks and abort handles.
 */
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

/**
 * Dispatches parsed client events and handles streaming lifecycles.
 */
export async function handleClientMessage(
  ws: WebSocketSender,
  rawMessage: WSMessageReceive,
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
      await handleChatTurn(ws, clientMsg, sessionManager.getAbortSignal(ws));
      break;
    }

    case "regenerate_suggestions": {
      await handleRegenerateSuggestions(
        ws,
        clientMsg.character_id,
        sessionManager.getAbortSignal(ws),
      );
      break;
    }

    case "request_image": {
      await handleImageRequest(
        ws,
        clientMsg.character_id,
        clientMsg.prompt_override,
        clientMsg.orientation,
        clientMsg.reference_url,
        sessionManager.getAbortSignal(ws),
      );
      break;
    }

    case "enhance_message": {
      await handleEnhanceMessage(ws, clientMsg.text);
      break;
    }

    case "request_photo_ideas": {
      await handlePhotoIdeas(ws, clientMsg.character_id, sessionManager.getAbortSignal(ws));
      break;
    }
  }
}
