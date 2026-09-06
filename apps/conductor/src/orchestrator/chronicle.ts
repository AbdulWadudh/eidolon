import { CHRONICLE, CHRONICLE_CONTEXT, QUEUE_JOBS, TRANSCRIPT } from "@eidolon/config";
import { countMessages, getTranscript } from "@/db";
import { getChronicles, nextChapterIndex } from "@/db/chronicles";
import { jobKey } from "@/queue/job-id";
import { enqueueGpuJob } from "@/queue/queues";
import type { ChronicleSummaryJob } from "@/queue/types";

const NEWLINE = String.fromCharCode(10);

export function chronicleJobId(characterId: string, milestone: number): string {
  return jobKey("chronicle", characterId, milestone);
}

export function isChronicleMilestone(messageCount: number): boolean {
  return messageCount > 0 && messageCount % CHRONICLE.batchSize === 0;
}

export function chapterForMilestone(milestone: number): number {
  return Math.floor(milestone / CHRONICLE.batchSize);
}

export function batchForMilestone(characterId: string): string[] {
  const window = Math.min(CHRONICLE.batchSize, TRANSCRIPT.pageSize);
  return getTranscript(characterId, window).map(
    (message) => `${message.role === "user" ? "PLAYER" : "THEM"}: ${message.content}`,
  );
}

export async function maybeSummarizeChronicle(characterId: string): Promise<string | null> {
  const total = countMessages(characterId);
  if (!isChronicleMilestone(total)) return null;

  const messageBatch = batchForMilestone(characterId);
  if (messageBatch.length === 0) return null;

  const data: ChronicleSummaryJob = {
    characterId,
    messageBatch,
    chapterIndex: chapterForMilestone(total),
  };

  const jobId = await enqueueGpuJob(QUEUE_JOBS.summarizeChronicle, data, {
    jobId: chronicleJobId(characterId, total),
  });

  return jobId ?? null;
}

export function getActiveChronicle(characterId: string): string {
  const chapters = getChronicles(characterId, CHRONICLE_CONTEXT.activeChapters);
  if (chapters.length === 0) return "";

  const body = [...chapters]
    .reverse()
    .map((chapter) => chapter.summaryText.trim())
    .filter((text) => text.length > 0)
    .join(NEWLINE);

  if (body.length === 0) return "";

  return `${CHRONICLE_CONTEXT.header}:${NEWLINE}${body}`;
}

export { nextChapterIndex };
