import { QUEUE_JOBS } from "@eidolon/config";
import { getStage } from "@/db/stages";
import { jobKey } from "@/queue/job-id";
import { enqueueGpuJob } from "@/queue/queues";
import type { StageBackdropJob } from "@/queue/types";

export interface StageRequest {
  characterId: string;
  stageName: string;
  prompt: string;
}

export function backdropJobId(characterId: string, stageName: string): string {
  return jobKey("backdrop", characterId, stageName);
}

export async function requestStageBackdrop(request: StageRequest): Promise<string | null> {
  const existing = getStage(request.characterId, request.stageName);
  if (existing?.backdropUrl) return null;

  const data: StageBackdropJob = {
    characterId: request.characterId,
    stageName: request.stageName,
    prompt: request.prompt,
  };

  const jobId = await enqueueGpuJob(QUEUE_JOBS.generateStageBackdrop, data, {
    jobId: backdropJobId(request.characterId, request.stageName),
  });

  return jobId ?? null;
}
