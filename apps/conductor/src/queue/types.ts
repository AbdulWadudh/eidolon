import { QUEUE_JOBS } from "@eidolon/config";
import type { Job } from "bullmq";

export interface StageBackdropJob {
  characterId: string;
  userId: string;
  stageName: string;
  prompt: string;
}

export interface PortraitJob {
  characterId: string;
  userId?: string;
  prompt: string;
}

export interface PersonaPortraitJob {
  personaId: string;
  userId: string;
  extra: string;
}

export interface ChatPhotoJob {
  characterId: string;
  userId: string;
  request: string;
  orientation?: "portrait" | "landscape" | "square";
  referenceUrl?: string;
}

export interface ChronicleSummaryJob {
  characterId: string;
  userId: string;
  messageBatch: string[];
  chapterIndex?: number;
}

export interface MediaUploadJob {
  characterId: string;
  filename: string;
  bufferBase64: string;
  messageId?: string;
}

export interface MediaRelocationJob {
  characterId: string;
  fromEmail: string;
  toEmail: string;
}

export interface ProactiveMessageJob {
  characterId: string;
  userId: string;
  contextPrompt: string;
}

export interface GpuJobMap {
  [QUEUE_JOBS.generateStageBackdrop]: StageBackdropJob;
  [QUEUE_JOBS.generatePortrait]: PortraitJob;
  [QUEUE_JOBS.generateChatPhoto]: ChatPhotoJob;
  [QUEUE_JOBS.generatePersonaPortrait]: PersonaPortraitJob;
  [QUEUE_JOBS.summarizeChronicle]: ChronicleSummaryJob;
}

export interface S3UploadJobMap {
  [QUEUE_JOBS.uploadImage]: MediaUploadJob;
  [QUEUE_JOBS.uploadAudio]: MediaUploadJob;
  [QUEUE_JOBS.relocateCharacterMedia]: MediaRelocationJob;
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

export function isPortraitJob(
  job: GpuJob,
): job is Job<PortraitJob, void, typeof QUEUE_JOBS.generatePortrait> {
  return job.name === QUEUE_JOBS.generatePortrait;
}

export function isChatPhotoJob(
  job: GpuJob,
): job is Job<ChatPhotoJob, void, typeof QUEUE_JOBS.generateChatPhoto> {
  return job.name === QUEUE_JOBS.generateChatPhoto;
}

export function isPersonaPortraitJob(
  job: GpuJob,
): job is Job<PersonaPortraitJob, void, typeof QUEUE_JOBS.generatePersonaPortrait> {
  return job.name === QUEUE_JOBS.generatePersonaPortrait;
}

export function isChronicleSummaryJob(
  job: GpuJob,
): job is Job<ChronicleSummaryJob, void, typeof QUEUE_JOBS.summarizeChronicle> {
  return job.name === QUEUE_JOBS.summarizeChronicle;
}

export function isMediaUploadJob(
  job: S3UploadJob,
): job is Job<MediaUploadJob, string | null, typeof QUEUE_JOBS.uploadImage> {
  return job.name === QUEUE_JOBS.uploadImage || job.name === QUEUE_JOBS.uploadAudio;
}

export function isMediaRelocationJob(
  job: S3UploadJob,
): job is Job<MediaRelocationJob, string | null, typeof QUEUE_JOBS.relocateCharacterMedia> {
  return job.name === QUEUE_JOBS.relocateCharacterMedia;
}
