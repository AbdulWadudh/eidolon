import { CHAT_TURN } from "@eidolon/config";
import { appendMessage, getCharacterCard, getRecentMessages, setMessageImage } from "@/db";
import { ComfyUnavailableError } from "@/services/comfyui";
import { paintSelfie, SELFIE_ASPECT } from "@/services/selfie";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

const DEFAULT_REQUEST = "a photo of yourself, right now, wherever you are";
const SENT_A_PHOTO = "*sends a photo*";

function formatScene(turns: { role: string; content: string }[], name: string): string {
  return turns
    .slice(-CHAT_TURN.historyTurns)
    .map((turn) => `${turn.role === "user" ? "PLAYER" : name}: ${turn.content}`)
    .join("\n");
}

function speak(ws: WebSocketSender, status: "painting" | "idle", detail?: string): void {
  sendServerMessage(ws, { type: "status_update", payload: { status, detail } });
}

export async function handleImageRequest(
  ws: WebSocketSender,
  characterId: string,
  promptOverride: string | undefined,
  signal: AbortSignal,
): Promise<void> {
  const card = getCharacterCard(characterId);
  speak(ws, "painting", "Finding the light");

  try {
    const selfie = await paintSelfie(
      {
        characterId,
        name: card.name,
        personality: card.personality,
        scene: formatScene(getRecentMessages(characterId), card.name),
        request: promptOverride?.trim() || DEFAULT_REQUEST,
      },
      () => speak(ws, "painting", "Taking the photo"),
      signal,
    );

    if (signal.aborted) return;

    const messageId = appendMessage(characterId, "assistant", SENT_A_PHOTO);
    setMessageImage(messageId, selfie.imageUrl);

    sendServerMessage(ws, {
      type: "image_ready",
      payload: {
        image_url: selfie.imageUrl,
        aspect_ratio: SELFIE_ASPECT,
        prompt_used: selfie.promptUsed,
      },
    });
  } catch (error) {
    const offline = error instanceof ComfyUnavailableError;
    console.error("[image-turn]", error);
    speak(ws, "idle", offline ? "No camera on this side" : "That photo did not come out");
    return;
  }

  speak(ws, "idle");
}
