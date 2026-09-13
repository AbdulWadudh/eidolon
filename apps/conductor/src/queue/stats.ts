import { QUEUE_NAMES, type QueueKey } from "@eidolon/config";
import type { Job, Queue } from "bullmq";
import { gpuQueue, proactiveQueue, s3UploadQueue } from "@/queue/queues";

export const QUEUE_STATES = ["waiting", "active", "delayed", "failed", "completed"] as const;

export type QueueState = (typeof QUEUE_STATES)[number];

export interface QueueJobView {
  id: string;
  name: string;
  state: QueueState;
  attemptsMade: number;
  characterId: string | null;
  failedReason: string | null;
  createdAt: number;
  runAt: number | null;
}

export interface QueueView {
  key: QueueKey;
  name: string;
  reachable: boolean;
  counts: Record<QueueState, number>;
  jobs: QueueJobView[];
}

const QUEUES: Record<QueueKey, Queue> = {
  gpu: gpuQueue as unknown as Queue,
  s3Upload: s3UploadQueue as unknown as Queue,
  proactive: proactiveQueue as unknown as Queue,
};

export function queueFor(key: string): Queue | null {
  return key in QUEUES ? QUEUES[key as QueueKey] : null;
}

function characterOf(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const held = (data as { characterId?: unknown }).characterId;
  return typeof held === "string" ? held : null;
}

function toJobView(job: Job, state: QueueState): QueueJobView {
  return {
    id: String(job.id ?? ""),
    name: job.name,
    state,
    attemptsMade: job.attemptsMade,
    characterId: characterOf(job.data),
    failedReason: job.failedReason ?? null,
    createdAt: job.timestamp,
    runAt: state === "delayed" ? job.timestamp + (job.opts.delay ?? 0) : null,
  };
}

async function jobsInState(
  queue: Queue,
  state: QueueState,
  limit: number,
): Promise<QueueJobView[]> {
  const jobs = await queue.getJobs([state], 0, limit - 1, false);
  return jobs.filter((job): job is Job => job !== undefined).map((job) => toJobView(job, state));
}

export async function describeQueue(key: QueueKey, perState: number): Promise<QueueView> {
  const queue = QUEUES[key];
  const empty: Record<QueueState, number> = {
    waiting: 0,
    active: 0,
    delayed: 0,
    failed: 0,
    completed: 0,
  };

  try {
    const counts = await queue.getJobCounts(...QUEUE_STATES);
    const collected = await Promise.all(
      QUEUE_STATES.filter((state) => state !== "completed").map((state) =>
        jobsInState(queue, state, perState),
      ),
    );

    return {
      key,
      name: QUEUE_NAMES[key],
      reachable: true,
      counts: { ...empty, ...(counts as Partial<Record<QueueState, number>>) },
      jobs: collected.flat(),
    };
  } catch {
    return { key, name: QUEUE_NAMES[key], reachable: false, counts: empty, jobs: [] };
  }
}

export async function describeQueues(perState: number): Promise<QueueView[]> {
  const keys = Object.keys(QUEUES) as QueueKey[];
  return Promise.all(keys.map((key) => describeQueue(key, perState)));
}

export async function retryJob(key: string, jobId: string): Promise<boolean> {
  const queue = queueFor(key);
  if (!queue) return false;

  const job = await queue.getJob(jobId);
  if (!job) return false;

  await job.retry();
  return true;
}

export async function removeJob(key: string, jobId: string): Promise<boolean> {
  const queue = queueFor(key);
  if (!queue) return false;

  const job = await queue.getJob(jobId);
  if (!job) return false;

  await job.remove();
  return true;
}

export async function retryFailed(key: string, limit: number): Promise<number> {
  const queue = queueFor(key);
  if (!queue) return 0;

  const jobs = await queue.getJobs(["failed"], 0, limit - 1, false);
  let retried = 0;

  for (const job of jobs) {
    if (!job) continue;
    await job.retry();
    retried += 1;
  }

  return retried;
}
