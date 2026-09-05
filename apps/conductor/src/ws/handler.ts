import { type ClientMessage, parseClientMessage } from "@eidolon/protocol";
import type { WSMessageReceive } from "hono/ws";
import { handleChatTurn, handleRegenerateSuggestions } from "@/ws/chat-turn";
import { handleImageRequest } from "@/ws/image-turn";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";
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
        sessionManager.getAbortSignal(ws),
      );
      break;
    }
  }
}
