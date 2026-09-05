import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { STORAGE } from "@eidolon/config";
import { getStorageConfig, missingStorageConfig, type StorageConfig } from "@eidolon/config/server";

export { getStorageConfig, missingStorageConfig, type StorageConfig };

export function imageKey(characterId: string, filename: string): string {
  return `${STORAGE.imagePrefix}/${characterId}/${filename}`;
}

export function audioKey(characterId: string, filename: string): string {
  return `${STORAGE.audioPrefix}/${characterId}/${filename}`;
}

export function publicUrl(key: string): string {
  return `${getStorageConfig().publicUrl}/${key}`;
}

let client: S3Client | null = null;
let connected = false;

export function getS3Client(): S3Client {
  if (client) {
    return client;
  }

  const config = getStorageConfig();
  client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return client;
}

export function isStorageConnected(): boolean {
  return connected;
}

export function buildPublicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadForMobileStreaming",
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

function isBucketMissing(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchBucket" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function reportFailure(config: StorageConfig, error: unknown): void {
  console.error(`[Storage] Could not reach bucket "${config.bucket}" at ${config.endpoint}`);
  console.error(`[Storage] ${describe(error)}`);
  console.error("[Storage] Check, in order:");
  console.error(`[Storage]   1. ${config.endpoint} is reachable from this host`);
  console.error("[Storage]   2. S3_ACCESS_KEY and S3_SECRET_KEY match the bucket's credentials");
  console.error(`[Storage]   3. S3_FORCE_PATH_STYLE is "true" unless the host has per-bucket DNS`);
  console.error("[Storage]   4. the key is allowed to create buckets and set bucket policies");
}

export async function initStorage(): Promise<boolean> {
  const missing = missingStorageConfig();
  if (missing.length > 0) {
    console.error(`[Storage] Not configured. Missing: ${missing.join(", ")}`);
    console.error("[Storage] Copy apps/conductor/.env.example and fill in the values.");
    connected = false;
    return false;
  }

  const config = getStorageConfig();
  const s3 = getS3Client();
  let created = false;

  try {
    await s3.send(new HeadBucketCommand({ Bucket: config.bucket }));
  } catch (error) {
    if (!isBucketMissing(error)) {
      reportFailure(config, error);
      connected = false;
      return false;
    }

    try {
      await s3.send(new CreateBucketCommand({ Bucket: config.bucket }));
      created = true;
    } catch (createError) {
      reportFailure(config, createError);
      connected = false;
      return false;
    }
  }

  let publicRead = true;
  try {
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: config.bucket,
        Policy: buildPublicReadPolicy(config.bucket),
      }),
    );
  } catch (error) {
    publicRead = false;
    console.warn(`[Storage] Public read policy not applied to "${config.bucket}"`);
    console.warn(`[Storage] ${describe(error)}`);
    console.warn("[Storage] Images and voice notes will return 403 to the mobile client.");
  }

  const state = created ? "created" : "ready";
  const reads = publicRead ? "public read" : "public read UNSET";
  console.log(`[Storage] Bucket "${config.bucket}" ${state} at ${config.endpoint} (${reads})`);

  connected = true;
  return true;
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const config = getStorageConfig();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return publicUrl(key);
}

export async function uploadImage(
  characterId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  return uploadFile(imageKey(characterId, filename), buffer, STORAGE.imageContentType);
}

export async function uploadAudio(
  characterId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  return uploadFile(audioKey(characterId, filename), buffer, STORAGE.audioContentType);
}

export async function deleteFile(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getStorageConfig().bucket, Key: key }),
  );
}
