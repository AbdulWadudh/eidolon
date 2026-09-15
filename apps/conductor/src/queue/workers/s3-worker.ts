import {
  QUEUE_CONCURRENCY,
  QUEUE_JOBS,
  QUEUE_LOCK,
  QUEUE_NAMES,
  QUEUE_PREFIXES,
} from "@eidolon/config";
import { Worker } from "bullmq";
import { messageOwner, setMessageAudio, setMessageImage } from "@/db";
import { queueConnection } from "@/queue/connection";
import {
  isMediaRelocationJob,
  isMediaUploadJob,
  type MediaUploadJob,
  type S3UploadJob,
  type S3UploadJobData,
  type S3UploadJobName,
} from "@/queue/types";
import { mp3DurationSeconds } from "@/services/audio-duration";
import { relocateCharacterMedia } from "@/services/owner-move";
import { isStorageConnected, uploadAudio, uploadImage } from "@/services/storage";

function ownerOf(data: MediaUploadJob): string {
  const userId = data.messageId ? messageOwner(data.messageId) : null;
  if (!userId) {
    throw new Error(`Upload job for "${data.filename}" has no message to attribute it to.`);
  }
  return userId;
}

async function storeImage(data: MediaUploadJob): Promise<string> {
  const bytes = Buffer.from(data.bufferBase64, "base64");
  const url = await uploadImage(ownerOf(data), data.characterId, data.filename, bytes);
  if (data.messageId) {
    setMessageImage(data.messageId, url, null);
  }
  return url;
}

async function storeAudio(data: MediaUploadJob): Promise<string> {
  const bytes = Buffer.from(data.bufferBase64, "base64");
  const url = await uploadAudio(ownerOf(data), data.characterId, data.filename, bytes);
  if (data.messageId) {
    setMessageAudio(data.messageId, url, mp3DurationSeconds(bytes));
  }
  return url;
}
export async function processUploadJob(job: S3UploadJob): Promise<string | null> {
  if (!isStorageConnected()) {
    throw new Error("Object storage is offline; the upload will be retried.");
  }

  if (isMediaRelocationJob(job)) {
    const { characterId, fromEmail, toEmail } = job.data;
    const moved = await relocateCharacterMedia(characterId, fromEmail, toEmail);
    return `${characterId}: moved ${moved} object(s) to ${toEmail}`;
  }

  if (isMediaUploadJob(job)) {
    if (job.data.bufferBase64.length === 0) {
      throw new Error(`Upload job ${job.id} carried an empty buffer.`);
    }
    return job.name === QUEUE_JOBS.uploadImage ? storeImage(job.data) : storeAudio(job.data);
  }

  throw new Error(`Unknown upload job "${job.name}".`);
}

export function createS3Worker(): Worker<S3UploadJobData, string | null, S3UploadJobName> {
  const worker = new Worker<S3UploadJobData, string | null, S3UploadJobName>(
    QUEUE_NAMES.s3Upload,
    processUploadJob,
    {
      connection: queueConnection(),
      prefix: QUEUE_PREFIXES.s3Upload,
      concurrency: QUEUE_CONCURRENCY.s3Upload,
      lockDuration: QUEUE_LOCK.durationMs,
      stalledInterval: QUEUE_LOCK.stalledIntervalMs,
      maxStalledCount: QUEUE_LOCK.maxStalledCount,
    },
  );

  worker.on("failed", (job, error) => {
    const attempt = job ? `${job.attemptsMade}/${job.opts.attempts ?? 1}` : "?";
    console.error(`[queue:s3] ${job?.name ?? "job"} attempt ${attempt} failed: ${error.message}`);
  });

  return worker;
}
