import { QUEUE_NAMES, type QueueKey } from "@eidolon/config";
import type { Job, Queue } from "bullmq";
import { QUEUE_VIEW } from "@/config";
import { gpuQueue, proactiveQueue, s3UploadQueue } from "@/queue/queues";

export const QUEUE_STATES = ["waiting", "active", "delayed", "failed", "completed"] as const;

export type QueueState = (typeof QUEUE_STATES)[number];

export interface QueueField {
  label: string;
  value: string;
  editable: boolean;
  kind: "string" | "number" | "boolean";
}

export interface QueueJobView {
  id: string;
  name: string;
  state: QueueState;
  attemptsMade: number;
  characterId: string | null;
  failedReason: string | null;
  createdAt: number;
  runAt: number | null;
  finishedAt: number | null;
  progress: number | null;
  input: QueueField[];
  output: string | null;
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

function isRedacted(key: string): boolean {
  const lowered = key.toLowerCase();
  return QUEUE_VIEW.redactedKeys.some((marker) => lowered.includes(marker));
}

function shorten(text: string): string {
  return text.length > QUEUE_VIEW.maxFieldChars
    ? `${text.slice(0, QUEUE_VIEW.maxFieldChars)}… (${text.length} chars)`
    : text;
}

export function describeValue(key: string, value: unknown): string {
  if (typeof value === "string") {
    return isRedacted(key) ? `${value.length} chars, not shown` : shorten(value);
  }
  if (Array.isArray(value)) return `${value.length} items`;
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return shorten(JSON.stringify(value));
  return String(value);
}

function editableKind(value: unknown): QueueField["kind"] | null {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return null;
}

export function describeInput(data: unknown): QueueField[] {
  if (typeof data !== "object" || data === null) return [];

  return Object.entries(data as Record<string, unknown>).map(([key, value]) => {
    const kind = editableKind(value);
    const shown = describeValue(key, value);
    const whole = typeof value !== "string" || shown === value;

    return {
      label: key,
      value: shown,
      editable: kind !== null && !isRedacted(key) && whole,
      kind: kind ?? "string",
    };
  });
}

export function describeOutput(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return describeValue("output", value);
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
    finishedAt: job.finishedOn ?? null,
    progress: typeof job.progress === "number" ? job.progress : null,
    input: describeInput(job.data),
    output: describeOutput(job.returnvalue),
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
      QUEUE_STATES.map((state) => jobsInState(queue, state, perState)),
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

export interface JobEditOutcome {
  ok: boolean;
  status: 404 | 409 | 400;
  error: string;
}

const NOT_FAILED = "Only a failed job can be edited, so a running worker never reads it changing.";

export async function updateJobData(
  key: string,
  jobId: string,
  patch: Record<string, unknown>,
): Promise<JobEditOutcome> {
  const queue = queueFor(key);
  if (!queue) return { ok: false, status: 404, error: "No such queue." };

  const job = await queue.getJob(jobId);
  if (!job) return { ok: false, status: 404, error: "No such job." };

  if ((await job.getState()) !== "failed") {
    return { ok: false, status: 409, error: NOT_FAILED };
  }

  const current = (job.data ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...current };

  for (const [field, value] of Object.entries(patch)) {
    if (!(field in current)) {
      return { ok: false, status: 400, error: `This job has no ${field}.` };
    }
    if (isRedacted(field)) {
      return { ok: false, status: 400, error: `${field} cannot be edited from here.` };
    }
    if (editableKind(current[field]) === null) {
      return { ok: false, status: 400, error: `${field} is not a plain value.` };
    }
    if (editableKind(value) !== editableKind(current[field])) {
      return {
        ok: false,
        status: 400,
        error: `${field} must stay a ${editableKind(current[field])}.`,
      };
    }
    merged[field] = value;
  }

  await job.updateData(merged);
  return { ok: true, status: 400, error: "" };
}
