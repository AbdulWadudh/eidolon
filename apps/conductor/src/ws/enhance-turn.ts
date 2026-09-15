import { userVoice } from "@/orchestrator/user";
import { EnhanceUnavailableError, enhanceMessage } from "@/services/enhance";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

export async function handleEnhanceMessage(
  ws: WebSocketSender,
  draft: string,
  characterId: string,
  userId: string,
): Promise<void> {
  try {
    const text = await enhanceMessage(draft, { user: userVoice(characterId, userId) });
    sendServerMessage(ws, {
      type: "message_enhanced",
      payload: { text, original: draft },
    });
  } catch (error) {
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
