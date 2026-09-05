import { type ClientMessage, parseClientMessage, parseServerMessage } from "@eidolon/protocol";
import type { WSMessageReceive } from "hono/ws";
import { queueImageGeneration } from "../services/comfyui";
import { streamChatCompletion } from "../services/llm";
import { formatSearchResults, searchWeb } from "../services/searxng";

export interface WebSocketSender {
  send: (data: string) => void;
}

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

/**
 * Sends a server message through the WebSocket after strictly validating through @eidolon/protocol.
 */
export function sendServerMessage(ws: WebSocketSender, message: unknown): void {
  const validated = parseServerMessage(message);
  ws.send(JSON.stringify(validated));
}

/**
 * Determines whether the user text contains an inquiry or explicit search intent.
 */
function shouldSearch(text: string): boolean {
  const lower = text.toLowerCase();
  const searchTriggers = [
    "who is",
    "what is",
    "where is",
    "when did",
    "why did",
    "how to",
    "search",
    "look up",
    "lookup",
    "tell me about",
    "weather",
    "news",
  ];
  return text.includes("?") || searchTriggers.some((trigger) => lower.includes(trigger));
}

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
      const signal = sessionManager.getAbortSignal(ws);
      const userText = clientMsg.text;
      let injectedContext = "";

      // 1. Web Search Check
      if (clientMsg.allow_search && shouldSearch(userText)) {
        sendServerMessage(ws, {
          type: "status_update",
          payload: {
            status: "searching",
            detail: `Searching for: ${userText.slice(0, 30)}...`,
          },
        });

        const searchResults = await searchWeb(userText);
        injectedContext = formatSearchResults(searchResults);
      }

      if (signal.aborted) return;

      // 2. Stream LLM Tokens
      sendServerMessage(ws, {
        type: "status_update",
        payload: {
          status: "thinking",
        },
      });

      const messages = [
        {
          role: "system",
          content: injectedContext
            ? `You are an AI companion. Use this fresh factual search context if relevant:\n${injectedContext}`
            : "You are an AI companion.",
        },
        {
          role: "user",
          content: userText,
        },
      ];

      let inAsteriskNarration = false;
      for await (const token of streamChatCompletion(messages, signal)) {
        if (signal.aborted) break;

        // Track narration mode: asterisks denote roleplay actions/narration
        if (token.includes("*")) {
          inAsteriskNarration = !inAsteriskNarration;
        }

        sendServerMessage(ws, {
          type: "text_delta",
          payload: {
            token,
            is_narration: inAsteriskNarration,
          },
        });
      }

      if (signal.aborted) return;

      // 3. Response Suggestions
      sendServerMessage(ws, {
        type: "reply_suggestions",
        payload: {
          suggestions: [
            "Tell me more about that.",
            "What should we do next?",
            "I understand, go on.",
          ],
        },
      });

      // 4. Mind Update
      sendServerMessage(ws, {
        type: "mind_update",
        payload: {
          affinity_delta: 2,
          current_affinity: 76,
          affinity_tier: "Trusted Confidant",
          current_mood: "Playful",
        },
      });

      // Reset to idle
      sendServerMessage(ws, {
        type: "status_update",
        payload: {
          status: "idle",
        },
      });
      break;
    }

    case "regenerate_suggestions": {
      sendServerMessage(ws, {
        type: "reply_suggestions",
        payload: {
          suggestions: [
            "Could you explain further?",
            "Let's change the topic.",
            "Tell me what you think.",
          ],
        },
      });
      break;
    }

    case "request_image": {
      sendServerMessage(ws, {
        type: "status_update",
        payload: {
          status: "painting",
          detail: "Dispatching generation workflow...",
        },
      });

      const prompt = clientMsg.prompt_override || "A high quality character portrait";
      await queueImageGeneration(prompt);

      // Emit mock preview frames followed by image_ready
      sendServerMessage(ws, {
        type: "image_preview",
        payload: {
          step: 12,
          total_steps: 25,
          preview_base64:
            "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/1/4AA=",
        },
      });

      sendServerMessage(ws, {
        type: "image_ready",
        payload: {
          image_url:
            "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80",
          aspect_ratio: "9:16",
          prompt_used: prompt,
        },
      });

      sendServerMessage(ws, {
        type: "status_update",
        payload: {
          status: "idle",
        },
      });
      break;
    }
  }
}
