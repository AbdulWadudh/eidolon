import { PROACTIVE, QUEUE_JOBS } from "@eidolon/config";
import { random } from "es-toolkit";
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
