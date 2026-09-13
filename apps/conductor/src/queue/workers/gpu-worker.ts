import {
  PHOTO_COPY,
  pronounsFor,
  QUEUE_CONCURRENCY,
  QUEUE_LOCK,
  QUEUE_NAMES,
  QUEUE_PREFIXES,
} from "@eidolon/config";
import { type Job, Worker } from "bullmq";
import { PORTRAIT, STAGE } from "@/config";
import { appendMessage, getCharacterCard, getRecentMessages, setMessageImage } from "@/db";
import { appendChronicle, nextChapterIndex } from "@/db/chronicles";
import { hasChosenBackground, setCharacterAvatar, setCharacterFace } from "@/db/look";
import { readerEmail } from "@/db/owner";
import { getPersona, updatePersona } from "@/db/personas";
import { addPortrait } from "@/db/portraits";
import { saveStageBackdrop } from "@/db/stages";
import { queueConnection } from "@/queue/connection";
import {
  type ChatPhotoJob,
  type ChronicleSummaryJob,
  type GpuJob,
  type GpuJobData,
  type GpuJobName,
  isChatPhotoJob,
  isChronicleSummaryJob,
  isPersonaPortraitJob,
  isPortraitJob,
  isStageBackdropJob,
  type PersonaPortraitJob,
  type PortraitJob,
  type StageBackdropJob,
} from "@/queue/types";
import { summarizeMessages } from "@/services/chronicle-writer";
import { ComfyUnavailableError, generateImage } from "@/services/comfyui";
import { composeAppearance, describeAppearance, describePersonaLook } from "@/services/photo-look";
import { ASPECT_FOR, formatPhotoScene, paintSelfie } from "@/services/selfie";
import { isStorageConnected, uploadImage, uploadPersonaPhoto } from "@/services/storage";
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
  const stage = saveStageBackdrop(data.characterId, data.userId, data.stageName, backdropUrl);

  const keepsTheirOwn = hasChosenBackground(data.characterId);

  broadcastToCharacter(data.characterId, data.userId, {
    type: "stage_shift",
    payload: {
      location_name: stage.name,
      backdrop_url: backdropUrl,
      replaces_background: !keepsTheirOwn,
      lighting_tint: stage.lightingTint,
      soundscape_stems: stage.soundscapeStems,
    },
  });
}

async function summarizeChronicle(data: ChronicleSummaryJob): Promise<void> {
  const card = getCharacterCard(data.characterId, data.userId);
  const bullets = await summarizeMessages(card.name, data.messageBatch);

  if (bullets.length === 0) {
    throw new Error("The model returned nothing that could be read as a chronicle entry.");
  }

  const chapterIndex = data.chapterIndex ?? nextChapterIndex(data.characterId, data.userId);
  appendChronicle(data.characterId, data.userId, chapterIndex, bullets.join(NEWLINE));
}

async function renderPortrait(data: PortraitJob): Promise<void> {
  if (!isStorageConnected()) {
    throw new Error("Object storage is offline, so the portrait would have nowhere to live.");
  }

  const card = getCharacterCard(data.characterId, null);
  const look = await describeAppearance({
    characterId: data.characterId,
    name: card.name,
    personality: card.personality,
    pronouns: card.pronouns,
  });

  const described = [
    pronounsFor(card.pronouns).figure,
    look.age,
    look.face,
    look.eyes,
    look.hair,
    look.skin,
    look.build,
  ]
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

  addPortrait(data.characterId, url, data.prompt.trim() || null);

  setCharacterAvatar(data.characterId, url);
  setCharacterFace(data.characterId, url);
}

async function renderChatPhoto(job: Job<ChatPhotoJob>, data: ChatPhotoJob): Promise<void> {
  const { characterId, userId } = data;
  const card = getCharacterCard(characterId, userId);

  const say = (message: unknown) => broadcastToCharacter(characterId, userId, message);

  try {
    const selfie = await paintSelfie(
      {
        characterId,
        name: card.name,
        personality: card.personality,
        pronouns: card.pronouns,
        scene: formatPhotoScene(getRecentMessages(characterId, userId), card.name),
        request: data.request,
        orientation: data.orientation,
        referenceUrl: data.referenceUrl,
      },
      {
        onProgress: ({ value, max }) => {
          void job.updateProgress(max > 0 ? Math.round((value / max) * 100) : 0);
          say({
            type: "image_preview",
            payload: { step: value, total_steps: max },
          });
        },
      },
    );

    const messageId = appendMessage(characterId, "assistant", selfie.message.trim(), userId);
    setMessageImage(messageId, selfie.imageUrl, selfie.caption || null);

    say({
      type: "image_ready",
      payload: {
        image_url: selfie.imageUrl,
        aspect_ratio: ASPECT_FOR[selfie.orientation],
        prompt_used: selfie.promptUsed,
        caption: selfie.message.trim(),
      },
    });
    say({ type: "status_update", payload: { status: "idle" } });
  } catch (error) {
    console.error("[chat-photo]", error);
    say({
      type: "image_failed",
      payload: {
        reason:
          error instanceof ComfyUnavailableError ? PHOTO_COPY.noCamera : PHOTO_COPY.didNotCome,
      },
    });
    say({ type: "status_update", payload: { status: "idle" } });
    throw error;
  }
}

function personaBrief(persona: {
  bio: string | null;
  personality: string | null;
  hobbies: string | null;
  likes: string | null;
  dislikes: string | null;
  chapters: { title: string | null; body: string }[];
}): string {
  return [
    persona.bio ? `About them: ${persona.bio}` : "",
    persona.personality ? `How they are: ${persona.personality}` : "",
    persona.hobbies ? `What they do: ${persona.hobbies}` : "",
    persona.likes ? `Drawn to: ${persona.likes}` : "",
    persona.dislikes ? `Put off by: ${persona.dislikes}` : "",
    persona.chapters.length > 0
      ? `What has happened to them: ${persona.chapters
          .map((chapter) => chapter.body)
          .join(" ")
          .slice(0, 400)}`
      : "",
  ]
    .filter((line) => line.length > 0)
    .join(NEWLINE);
}

async function renderPersonaPortrait(data: PersonaPortraitJob): Promise<void> {
  if (!isStorageConnected()) {
    throw new Error("Object storage is offline, so the portrait would have nowhere to live.");
  }

  const persona = getPersona(data.personaId, data.userId);
  if (!persona) throw new Error(`Persona "${data.personaId}" is gone.`);

  const reader = readerEmail(data.userId);
  const look = await describePersonaLook({
    name: persona.name,
    about: personaBrief(persona),
    extra: data.extra,
    pronouns: persona.pronouns,
  });

  const prompt = [
    composeAppearance(look, "", pronounsFor(persona.pronouns).figure),
    data.extra.trim(),
    PORTRAIT.framing,
  ]
    .filter((part) => part.length > 0)
    .join(", ");

  const image = await generateImage(prompt, null, { orientation: PORTRAIT.orientation });
  const photoUrl = await uploadPersonaPhoto(
    reader,
    data.personaId,
    `portrait-${Date.now()}.${STAGE.backdropFileExtension}`,
    image.bytes,
  );

  updatePersona(data.personaId, data.userId, { photoUrl });
}

export async function processGpuJob(job: GpuJob): Promise<void> {
  if (isPersonaPortraitJob(job)) {
    await renderPersonaPortrait(job.data);
    return;
  }
  if (isChatPhotoJob(job)) {
    await renderChatPhoto(job, job.data);
    return;
  }
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
    lockDuration: QUEUE_LOCK.durationMs,
    stalledInterval: QUEUE_LOCK.stalledIntervalMs,
    maxStalledCount: QUEUE_LOCK.maxStalledCount,
  });

  worker.on("failed", (job, error) => {
    console.error(`[queue:gpu] ${job?.name ?? "job"} ${job?.id ?? "?"} failed: ${error.message}`);
  });

  return worker;
}
