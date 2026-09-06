import { EnhanceUnavailableError, enhanceMessage } from "@/services/enhance";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

export async function handleEnhanceMessage(ws: WebSocketSender, draft: string): Promise<void> {
  try {
    const text = await enhanceMessage(draft);
    sendServerMessage(ws, {
      type: "message_enhanced",
      payload: { text, original: draft },
    });
  } catch (error) {
    // The draft is never touched on this path: the client keeps what the reader
    // typed and only hears that the rework did not happen.
    sendServerMessage(ws, {
      type: "error",
      payload: {
        code: "ENHANCE_FAILED",
        message:
          error instanceof EnhanceUnavailableError
            ? error.message
            : "The rewrite could not be finished.",
      },
    });
  }
}
