import { QUEUE_CONCURRENCY, QUEUE_JOBS, QUEUE_NAMES, QUEUE_PREFIXES } from "@eidolon/config";
import { Worker } from "bullmq";
import { setMessageAudio, setMessageImage } from "@/db";
import { queueConnection } from "@/queue/connection";
import type { MediaUploadJob, S3UploadJob, S3UploadJobData, S3UploadJobName } from "@/queue/types";
import { mp3DurationSeconds } from "@/services/audio-duration";
import { isStorageConnected, uploadAudio, uploadImage } from "@/services/storage";

async function storeImage(data: MediaUploadJob): Promise<string> {
  const bytes = Buffer.from(data.bufferBase64, "base64");
  const url = await uploadImage(data.characterId, data.filename, bytes);
  if (data.messageId) {
    setMessageImage(data.messageId, url, null);
  }
  return url;
}

async function storeAudio(data: MediaUploadJob): Promise<string> {
  const bytes = Buffer.from(data.bufferBase64, "base64");
  const url = await uploadAudio(data.characterId, data.filename, bytes);
  if (data.messageId) {
    setMessageAudio(data.messageId, url, mp3DurationSeconds(bytes));
  }
  return url;
}

export async function processUploadJob(job: S3UploadJob): Promise<string | null> {
  if (!isStorageConnected()) {
    throw new Error("Object storage is offline; the upload will be retried.");
  }
  if (job.data.bufferBase64.length === 0) {
    throw new Error(`Upload job ${job.id} carried an empty buffer.`);
  }

  if (job.name === QUEUE_JOBS.uploadImage) {
    return storeImage(job.data);
  }
  if (job.name === QUEUE_JOBS.uploadAudio) {
    return storeAudio(job.data);
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
    },
  );

  worker.on("failed", (job, error) => {
    const attempt = job ? `${job.attemptsMade}/${job.opts.attempts ?? 1}` : "?";
    console.error(`[queue:s3] ${job?.name ?? "job"} attempt ${attempt} failed: ${error.message}`);
  });

  return worker;
}
