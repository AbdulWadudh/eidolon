import { QUEUE_JOBS } from "@eidolon/config";
import type { Job } from "bullmq";

export interface StageBackdropJob {
  characterId: string;
  stageName: string;
  prompt: string;
}

export interface ChronicleSummaryJob {
  characterId: string;
  messageBatch: string[];
  chapterIndex?: number;
}

export interface MediaUploadJob {
  characterId: string;
  filename: string;
  bufferBase64: string;
  messageId?: string;
}

export interface ProactiveMessageJob {
  characterId: string;
  contextPrompt: string;
}

export interface GpuJobMap {
  [QUEUE_JOBS.generateStageBackdrop]: StageBackdropJob;
  [QUEUE_JOBS.summarizeChronicle]: ChronicleSummaryJob;
}

export interface S3UploadJobMap {
  [QUEUE_JOBS.uploadImage]: MediaUploadJob;
  [QUEUE_JOBS.uploadAudio]: MediaUploadJob;
}

export interface ProactiveJobMap {
  [QUEUE_JOBS.proactiveMessage]: ProactiveMessageJob;
}

export type GpuJobName = keyof GpuJobMap;
export type S3UploadJobName = keyof S3UploadJobMap;
export type ProactiveJobName = keyof ProactiveJobMap;

export type GpuJobData = GpuJobMap[GpuJobName];
export type S3UploadJobData = S3UploadJobMap[S3UploadJobName];
export type ProactiveJobData = ProactiveJobMap[ProactiveJobName];

export type GpuJob = Job<GpuJobData, void, GpuJobName>;
export type S3UploadJob = Job<S3UploadJobData, string | null, S3UploadJobName>;
export type ProactiveJob = Job<ProactiveJobData, void, ProactiveJobName>;

export function isStageBackdropJob(
  job: GpuJob,
): job is Job<StageBackdropJob, void, typeof QUEUE_JOBS.generateStageBackdrop> {
  return job.name === QUEUE_JOBS.generateStageBackdrop;
}

export function isChronicleSummaryJob(
  job: GpuJob,
): job is Job<ChronicleSummaryJob, void, typeof QUEUE_JOBS.summarizeChronicle> {
  return job.name === QUEUE_JOBS.summarizeChronicle;
}
