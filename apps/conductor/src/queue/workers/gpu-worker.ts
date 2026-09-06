import { PORTRAIT, QUEUE_CONCURRENCY, QUEUE_NAMES, QUEUE_PREFIXES, STAGE } from "@eidolon/config";
import { Worker } from "bullmq";
import { getCharacterCard } from "@/db";
import { appendChronicle, nextChapterIndex } from "@/db/chronicles";
import { setCharacterAvatar, setCharacterFace } from "@/db/look";
import { addPortrait } from "@/db/portraits";
import { saveStageBackdrop } from "@/db/stages";
import { queueConnection } from "@/queue/connection";
import {
  type ChronicleSummaryJob,
  type GpuJob,
  type GpuJobData,
  type GpuJobName,
  isChronicleSummaryJob,
  isPortraitJob,
  isStageBackdropJob,
  type PortraitJob,
  type StageBackdropJob,
} from "@/queue/types";
import { summarizeMessages } from "@/services/chronicle-writer";
import { generateImage } from "@/services/comfyui";
import { describeAppearance } from "@/services/photo-look";
import { isStorageConnected, uploadImage } from "@/services/storage";
import { broadcastToCharacter } from "@/ws/registry";

const NEWLINE = String.fromCharCode(10);

function backdropFilename(stageName: string): string {
  const slug = stageName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `stage-${slug || "unnamed"}-${Date.now()}.${STAGE.backdropFileExtension}`;
}

async function renderStageBackdrop(data: StageBackdropJob): Promise<void> {
  if (!isStorageConnected()) {
    throw new Error("Object storage is offline, so the backdrop would have nowhere to live.");
  }

  const image = await generateImage(data.prompt, null, { orientation: STAGE.orientation });
  const backdropUrl = await uploadImage(
    data.characterId,
    backdropFilename(data.stageName),
    image.bytes,
  );
  const stage = saveStageBackdrop(data.characterId, data.stageName, backdropUrl);

  broadcastToCharacter(data.characterId, {
    type: "stage_shift",
    payload: {
      location_name: stage.name,
      backdrop_url: backdropUrl,
      lighting_tint: stage.lightingTint,
      soundscape_stems: stage.soundscapeStems,
    },
  });
}

async function summarizeChronicle(data: ChronicleSummaryJob): Promise<void> {
  const card = getCharacterCard(data.characterId);
  const bullets = await summarizeMessages(card.name, data.messageBatch);

  if (bullets.length === 0) {
    throw new Error("The model returned nothing that could be read as a chronicle entry.");
  }

  const chapterIndex = data.chapterIndex ?? nextChapterIndex(data.characterId);
  appendChronicle(data.characterId, chapterIndex, bullets.join(NEWLINE));
}

async function renderPortrait(data: PortraitJob): Promise<void> {
  if (!isStorageConnected()) {
    throw new Error("Object storage is offline, so the portrait would have nowhere to live.");
  }

  const card = getCharacterCard(data.characterId);
  const look = await describeAppearance({
    characterId: data.characterId,
    name: card.name,
    personality: card.personality,
  });

  const described = [look.age, look.face, look.eyes, look.hair, look.skin, look.build]
    .filter((part) => part.trim().length > 0)
    .join(", ");

  const prompt = [described, data.prompt.trim(), PORTRAIT.framing]
    .filter((part) => part.length > 0)
    .join(", ");

  const image = await generateImage(prompt, null, { orientation: PORTRAIT.orientation });
  const url = await uploadImage(
    data.characterId,
    `portrait-${Date.now()}.${STAGE.backdropFileExtension}`,
    image.bytes,
  );

  // Kept as a row of its own before it is put into use, so the portrait it
  // replaces stays in her gallery and can be chosen again.
  addPortrait(data.characterId, url, data.prompt.trim() || null);

  // The same picture becomes both the avatar and the face reference, so every
  // later selfie is recognisably the same person.
  setCharacterAvatar(data.characterId, url);
  setCharacterFace(data.characterId, url);
}

export async function processGpuJob(job: GpuJob): Promise<void> {
  if (isStageBackdropJob(job)) {
    await renderStageBackdrop(job.data);
    return;
  }
  if (isPortraitJob(job)) {
    await renderPortrait(job.data);
    return;
  }
  if (isChronicleSummaryJob(job)) {
    await summarizeChronicle(job.data);
    return;
  }
  throw new Error(`Unknown GPU job "${job.name}".`);
}

export function createGpuWorker(): Worker<GpuJobData, void, GpuJobName> {
  const worker = new Worker<GpuJobData, void, GpuJobName>(QUEUE_NAMES.gpu, processGpuJob, {
    connection: queueConnection(),
    prefix: QUEUE_PREFIXES.gpu,
    concurrency: QUEUE_CONCURRENCY.gpu,
  });

  worker.on("failed", (job, error) => {
    console.error(`[queue:gpu] ${job?.name ?? "job"} ${job?.id ?? "?"} failed: ${error.message}`);
  });

  return worker;
}
