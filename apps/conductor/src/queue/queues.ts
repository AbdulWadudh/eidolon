import {
  QUEUE_NAMES,
  QUEUE_PREFIXES,
  QUEUE_PROACTIVE_RETRY,
  QUEUE_RETENTION,
  QUEUE_UPLOAD_RETRY,
} from "@eidolon/config";
import { type JobsOptions, Queue } from "bullmq";
import { queueConnection } from "@/queue/connection";
import type {
  GpuJobMap,
  GpuJobName,
  ProactiveJobMap,
  ProactiveJobName,
  S3UploadJobMap,
  S3UploadJobName,
} from "@/queue/types";

export const gpuQueue = new Queue<GpuJobMap[GpuJobName], void, GpuJobName>(QUEUE_NAMES.gpu, {
  connection: queueConnection(),
  prefix: QUEUE_PREFIXES.gpu,
  defaultJobOptions: {
    removeOnComplete: QUEUE_RETENTION.removeOnComplete,
    removeOnFail: QUEUE_RETENTION.removeOnFail,
  },
});

export const s3UploadQueue = new Queue<
  S3UploadJobMap[S3UploadJobName],
  string | null,
  S3UploadJobName
>(QUEUE_NAMES.s3Upload, {
  connection: queueConnection(),
  prefix: QUEUE_PREFIXES.s3Upload,
  defaultJobOptions: {
    attempts: QUEUE_UPLOAD_RETRY.attempts,
    backoff: {
      type: QUEUE_UPLOAD_RETRY.backoffType,
      delay: QUEUE_UPLOAD_RETRY.backoffDelayMs,
    },
    removeOnComplete: QUEUE_RETENTION.removeOnComplete,
    removeOnFail: QUEUE_RETENTION.removeOnFail,
  },
});

export const proactiveQueue = new Queue<ProactiveJobMap[ProactiveJobName], void, ProactiveJobName>(
  QUEUE_NAMES.proactive,
  {
    connection: queueConnection(),
    prefix: QUEUE_PREFIXES.proactive,
    defaultJobOptions: {
      attempts: QUEUE_PROACTIVE_RETRY.attempts,
      backoff: {
        type: QUEUE_PROACTIVE_RETRY.backoffType,
        delay: QUEUE_PROACTIVE_RETRY.backoffDelayMs,
      },
      removeOnComplete: QUEUE_RETENTION.removeOnComplete,
      removeOnFail: QUEUE_RETENTION.removeOnFail,
    },
  },
);

export const allQueues = [gpuQueue, s3UploadQueue, proactiveQueue] as const;

export async function enqueueGpuJob<N extends GpuJobName>(
  name: N,
  data: GpuJobMap[N],
  options?: JobsOptions,
): Promise<string | undefined> {
  const job = await gpuQueue.add(name, data, options);
  return job.id;
}

export async function enqueueUploadJob<N extends S3UploadJobName>(
  name: N,
  data: S3UploadJobMap[N],
  options?: JobsOptions,
): Promise<string | undefined> {
  const job = await s3UploadQueue.add(name, data, options);
  return job.id;
}

export async function enqueueProactiveJob<N extends ProactiveJobName>(
  name: N,
  data: ProactiveJobMap[N],
  options?: JobsOptions,
): Promise<string | undefined> {
  const job = await proactiveQueue.add(name, data, options);
  return job.id;
}

export async function closeQueues(): Promise<void> {
  await Promise.all(allQueues.map((queue) => queue.close()));
}
