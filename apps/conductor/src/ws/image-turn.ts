import { PHOTO_COPY, QUEUE_JOBS } from "@eidolon/config";
import { getCharacterCard, getRecentMessages } from "@/db";
import { announceQueuePlaces } from "@/queue/queue-place";
import { enqueueGpuJob } from "@/queue/queues";
import { generatePhotoIdeas } from "@/services/photo-ideas";
import { formatPhotoScene } from "@/services/selfie";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

const DEFAULT_REQUEST = "a photo of yourself, right now, wherever you are";

function speak(ws: WebSocketSender, status: "painting" | "idle", detail?: string): void {
  sendServerMessage(ws, { type: "status_update", payload: { status, detail } });
}

export async function handlePhotoIdeas(
  ws: WebSocketSender,
  userId: string,
  characterId: string,
  isEditing: boolean,
  signal: AbortSignal,
  exclude: string[] = [],
): Promise<void> {
  const card = getCharacterCard(characterId, userId);
  const ideas = await generatePhotoIdeas(
    card.name,
    card.personality,
    formatPhotoScene(getRecentMessages(characterId, userId), card.name),
    signal,
    isEditing,
    exclude,
  );
  if (signal.aborted) return;
  sendServerMessage(ws, { type: "photo_ideas", payload: { ideas } });
}

export async function handleImageRequest(
  ws: WebSocketSender,
  userId: string,
  characterId: string,
  promptOverride: string | undefined,
  orientation: "portrait" | "landscape" | "square" | undefined,
  referenceUrl: string | undefined,
): Promise<void> {
  speak(ws, "painting", PHOTO_COPY.framing);

  try {
    await enqueueGpuJob(QUEUE_JOBS.generateChatPhoto, {
      characterId,
      userId,
      request: promptOverride?.trim() || DEFAULT_REQUEST,
      orientation,
      referenceUrl,
    });

    void announceQueuePlaces();
  } catch (error) {
    console.error("[image-turn] the photo could not be queued", error);
    sendServerMessage(ws, {
      type: "image_failed",
      payload: { reason: PHOTO_COPY.didNotCome },
    });
    speak(ws, "idle");
  }
}
