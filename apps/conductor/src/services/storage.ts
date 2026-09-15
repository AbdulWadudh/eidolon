import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { STORAGE } from "@eidolon/config";
import { getStorageConfig, missingStorageConfig, type StorageConfig } from "@eidolon/config/server";
import sharp from "sharp";
import { IMAGE_ENCODE } from "@/config";
import { characterHome, userEmail } from "@/db/owner";

export { getStorageConfig, missingStorageConfig, type StorageConfig };

function folderIn(home: string, characterId: string, folder: string): string {
  return `${home}/${STORAGE.characterPrefix}/${characterId}/${folder}/`;
}

// A character's own art: hers, not any one user's. Published art sits under a shared
// prefix so handing the character over moves nothing and a fork's url never breaks.
export function portraitKey(characterId: string, filename: string): string {
  const home = characterHome(characterId);

  return home === STORAGE.publicPrefix
    ? `${home}/${STORAGE.characterPrefix}/${characterId}/${filename}`
    : `${folderIn(home, characterId, STORAGE.portraitFolder)}${filename}`;
}

// Everything made inside a conversation belongs to the user who was in it, whoever
// happens to own the character.
export function imageKey(userId: string, characterId: string, filename: string): string {
  return `${folderIn(userEmail(userId), characterId, STORAGE.imageFolder)}${filename}`;
}

export function audioKey(userId: string, characterId: string, filename: string): string {
  return `${folderIn(userEmail(userId), characterId, STORAGE.audioFolder)}${filename}`;
}

export function stageKey(userId: string, characterId: string, filename: string): string {
  return `${folderIn(userEmail(userId), characterId, STORAGE.stageFolder)}${filename}`;
}

export function personaKey(email: string, personaId: string, filename: string): string {
  return `${email}/${STORAGE.personaPrefix}/${personaId}/${filename}`;
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

export async function toStoredImage(buffer: Buffer | Uint8Array): Promise<Buffer> {
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  try {
    const image = sharp(input);
    const { format } = await image.metadata();
    if (format === IMAGE_ENCODE.format) return input;

    return await image
      .webp({ quality: IMAGE_ENCODE.quality, effort: IMAGE_ENCODE.effort })
      .toBuffer();
  } catch (error) {
    console.warn(
      `[Storage] Could not re-encode an image, storing it as it came: ${describe(error)}`,
    );
    return input;
  }
}

export function asWebpName(filename: string): string {
  const base = filename.replace(/\.[^.]*$/, "");
  return `${base || "image"}${IMAGE_ENCODE.extension}`;
}

export async function uploadPortrait(
  characterId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  const encoded = await toStoredImage(buffer);
  return uploadFile(
    portraitKey(characterId, asWebpName(filename)),
    encoded,
    STORAGE.imageContentType,
  );
}

export async function uploadImage(
  userId: string,
  characterId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  const encoded = await toStoredImage(buffer);
  return uploadFile(
    imageKey(userId, characterId, asWebpName(filename)),
    encoded,
    STORAGE.imageContentType,
  );
}

export async function uploadStageBackdrop(
  userId: string,
  characterId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  const encoded = await toStoredImage(buffer);
  return uploadFile(
    stageKey(userId, characterId, asWebpName(filename)),
    encoded,
    STORAGE.imageContentType,
  );
}
export async function uploadPersonaPhoto(
  email: string,
  personaId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  const encoded = await toStoredImage(buffer);
  return uploadFile(
    personaKey(email, personaId, asWebpName(filename)),
    encoded,
    STORAGE.imageContentType,
  );
}

export async function uploadAudio(
  userId: string,
  characterId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  return uploadFile(audioKey(userId, characterId, filename), buffer, STORAGE.audioContentType);
}

export async function deleteFile(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getStorageConfig().bucket, Key: key }),
  );
}

export async function listKeys(prefix: string): Promise<string[]> {
  const bucket = getStorageConfig().bucket;
  const s3 = getS3Client();
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );

    for (const object of page.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }

    token = page.NextContinuationToken;
  } while (token);

  return keys;
}

export async function copyFile(fromKey: string, toKey: string): Promise<void> {
  const bucket = getStorageConfig().bucket;

  await getS3Client().send(
    new CopyObjectCommand({
      Bucket: bucket,
      // A copy source is a path, so each segment is escaped on its own — an owner
      // email carrying "+" would otherwise arrive at the bucket as a space.
      CopySource: `${bucket}/${fromKey}`.split("/").map(encodeURIComponent).join("/"),
      Key: toKey,
    }),
  );
}
