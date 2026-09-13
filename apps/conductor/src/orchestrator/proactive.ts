import { QUEUE_JOBS } from "@eidolon/config";
import { random } from "es-toolkit";
import { PROACTIVE } from "@/config";
import { jobKey } from "@/queue/job-id";
import { enqueueProactiveJob, proactiveQueue } from "@/queue/queues";
import type { ProactiveMessageJob } from "@/queue/types";

export function proactiveJobId(characterId: string): string {
  return jobKey("proactive", characterId);
}

export function nextSilenceMs(): number {
  return Math.round(random(PROACTIVE.minDelayMs, PROACTIVE.maxDelayMs));
}

export async function scheduleProactiveFollowUp(
  characterId: string,
  contextPrompt: string,
): Promise<string | null> {
  const jobId = proactiveJobId(characterId);

  const pending = await proactiveQueue.getJob(jobId);
  if (pending) await pending.remove();

  const data: ProactiveMessageJob = { characterId, contextPrompt };

  const queued = await enqueueProactiveJob(QUEUE_JOBS.proactiveMessage, data, {
    jobId,
    delay: nextSilenceMs(),
  });

  return queued ?? null;
}

export interface PendingProactive {
  jobId: string;
  runAt: number;
  contextPrompt: string;
}

export async function pendingProactive(characterId: string): Promise<PendingProactive | null> {
  try {
    const job = await proactiveQueue.getJob(proactiveJobId(characterId));
    if (!job) return null;

    return {
      jobId: String(job.id ?? ""),
      runAt: job.timestamp + (job.opts.delay ?? 0),
      contextPrompt: job.data.contextPrompt,
    };
  } catch {
    return null;
  }
}

export async function cancelProactive(characterId: string): Promise<boolean> {
  try {
    const job = await proactiveQueue.getJob(proactiveJobId(characterId));
    if (!job) return false;

    await job.remove();
    return true;
  } catch {
    return false;
  }
}
