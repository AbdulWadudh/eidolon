import { IMAGE } from "@eidolon/config";
import { appendMessage, getCharacterCard, getRecentMessages, setMessageImage } from "@/db";
import { ComfyUnavailableError } from "@/services/comfyui";
import { generatePhotoIdeas } from "@/services/photo-ideas";
import { ASPECT_FOR, paintSelfie } from "@/services/selfie";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

const DEFAULT_REQUEST = "a photo of yourself, right now, wherever you are";

function formatScene(turns: { role: string; content: string }[], name: string): string {
  return turns
    .slice(-IMAGE.sceneTurns)
    .map((turn) => `${turn.role === "user" ? "PLAYER" : name}: ${turn.content}`)
    .join("\n");
}

function speak(ws: WebSocketSender, status: "painting" | "idle", detail?: string): void {
  sendServerMessage(ws, { type: "status_update", payload: { status, detail } });
}

export async function handlePhotoIdeas(
  ws: WebSocketSender,
  characterId: string,
  signal: AbortSignal,
): Promise<void> {
  const card = getCharacterCard(characterId);
  const ideas = await generatePhotoIdeas(
    card.name,
    formatScene(getRecentMessages(characterId), card.name),
    signal,
  );
  if (signal.aborted) return;
  sendServerMessage(ws, { type: "photo_ideas", payload: { ideas } });
}

export async function handleImageRequest(
  ws: WebSocketSender,
  characterId: string,
  promptOverride: string | undefined,
  orientation: "portrait" | "landscape" | "square" | undefined,
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
        orientation,
      },
      {
        onProgress: (progress) => {
          sendServerMessage(ws, {
            type: "image_preview",
            payload: { step: progress.value, total_steps: progress.max },
          });
        },
        onPreview: (dataUri) => {
          sendServerMessage(ws, {
            type: "image_preview",
            payload: { step: 0, total_steps: IMAGE.steps, preview_base64: dataUri },
          });
        },
      },
      signal,
    );

    if (signal.aborted) return;

    const spoken = selfie.message.trim();
    const messageId = appendMessage(characterId, "assistant", spoken);
    setMessageImage(messageId, selfie.imageUrl, selfie.caption || null);

    sendServerMessage(ws, {
      type: "image_ready",
      payload: {
        image_url: selfie.imageUrl,
        aspect_ratio: ASPECT_FOR[selfie.orientation],
        prompt_used: selfie.promptUsed,
        caption: selfie.message.trim(),
      },
    });
  } catch (error) {
    const offline = error instanceof ComfyUnavailableError;
    console.error("[image-turn]", error);
    sendServerMessage(ws, {
      type: "image_failed",
      payload: {
        reason: offline ? "No camera on this side" : "That photo did not come out",
      },
    });
    speak(ws, "idle");
    return;
  }

  speak(ws, "idle");
}
