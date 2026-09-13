import { QUEUE_JOBS } from "@eidolon/config";
import { jobKey } from "@/queue/job-id";
import { enqueueGpuJob } from "@/queue/queues";
import type { StageBackdropJob } from "@/queue/types";

export interface StageRequest {
  characterId: string;
  userId: string;
  stageName: string;
  prompt: string;
}

export function backdropJobId(characterId: string, userId: string, stageName: string): string {
  return jobKey("backdrop", characterId, userId, stageName);
}

export async function requestStageBackdrop(request: StageRequest): Promise<string | null> {
  const data: StageBackdropJob = {
    characterId: request.characterId,
    userId: request.userId,
    stageName: request.stageName,
    prompt: request.prompt,
  };

  const jobId = await enqueueGpuJob(QUEUE_JOBS.generateStageBackdrop, data, {
    jobId: backdropJobId(request.characterId, request.userId, request.stageName),
  });

  return jobId ?? null;
}
