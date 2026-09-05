import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * S3-compatible object storage for character images and voice notes.
 *
 * Portraits, backdrops and voice notes used to be written into the working
 * tree, which put binaries into git history and destroyed them on reclone. They
 * now live in a bucket that serves anonymous reads, so the mobile client streams
 * them straight over HTTPS and the conductor never has to proxy bytes or mint
 * pre-signed URLs on a phone's timescale.
 *
 * No host is baked in. Every endpoint, bucket and credential comes from the
 * environment - see `.env.example` - so the same build points at a local MinIO,
 * a self-hosted gateway or AWS itself without a code change.
 */

/**
 * S3 requires a region in the signature even where the implementation ignores
 * it. This is the protocol's own default, not a deployment detail.
 */
const DEFAULT_REGION = "us-east-1";

/** Settings that must be present before any request can be signed. */
const REQUIRED_ENV = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY"] as const;

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  publicUrl: string;
  forcePathStyle: boolean;
}

/**
 * Reads storage settings from the environment on every call rather than
 * freezing them at import time, so a test can retarget the service without
 * having to reset the module registry.
 */
export function getStorageConfig(): StorageConfig {
  const endpoint = process.env.S3_ENDPOINT ?? "";
  const bucket = process.env.S3_BUCKET ?? "";
  const derivedPublicUrl = endpoint && bucket ? `${endpoint}/${bucket}` : "";

  return {
    endpoint,
    bucket,
    region: process.env.S3_REGION || DEFAULT_REGION,
    publicUrl: process.env.S3_PUBLIC_URL || derivedPublicUrl,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

/** Names of the required settings that are absent or empty. */
export function missingStorageConfig(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

let client: S3Client | null = null;
let connected = false;

/**
 * The shared S3 client, built on first use.
 *
 * `forcePathStyle` belongs on for any host without wildcard DNS for bucket
 * subdomains - most self-hosted gateways - or every request resolves to
 * `<bucket>.<host>` and fails to connect.
 */
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
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });

  return client;
}

/** Whether the last {@link initStorage} call reached the bucket. */
export function isStorageConnected(): boolean {
  return connected;
}

/** Object key for a character portrait, backdrop or other still image. */
export function imageKey(characterId: string, filename: string): string {
  return `images/characters/${characterId}/${filename}`;
}

/** Object key for a generated voice note. */
export function audioKey(characterId: string, filename: string): string {
  return `audio/${characterId}/${filename}`;
}

/** Public HTTPS URL the mobile client streams `key` from. */
export function publicUrl(key: string): string {
  return `${getStorageConfig().publicUrl}/${key}`;
}

/**
 * Bucket policy granting anonymous `GetObject`. Writes stay credentialed; only
 * reads are open, which is what lets an `<Image>` or an audio element point
 * directly at the bucket.
 */
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

/** A missing bucket, as opposed to bad credentials or an unreachable host. */
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

/**
 * Logs enough to tell the failure modes apart without a packet capture: host
 * unreachable, credentials rejected, permission missing.
 */
function reportFailure(config: StorageConfig, error: unknown): void {
  console.error(`[Storage] Could not reach bucket "${config.bucket}" at ${config.endpoint}`);
  console.error(`[Storage] ${describe(error)}`);
  console.error("[Storage] Check, in order:");
  console.error(`[Storage]   1. ${config.endpoint} is reachable from this host`);
  console.error("[Storage]   2. S3_ACCESS_KEY and S3_SECRET_KEY match the bucket's credentials");
  console.error(`[Storage]   3. S3_FORCE_PATH_STYLE is "true" unless the host has per-bucket DNS`);
  console.error("[Storage]   4. the key is allowed to create buckets and set bucket policies");
}

/**
 * Ensures the media bucket exists and serves public reads. Called once on boot;
 * returns `false` rather than throwing, because storage being down should
 * degrade media, not stop the gateway from answering pairing and chat.
 */
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

  // Re-applied on every boot rather than only after CreateBucket. The bucket
  // outlives the process, so in practice it always already exists - and one that
  // was provisioned by hand carries no policy at all, which is exactly the case
  // that answers the mobile client's image and audio requests with 403.
  let publicRead = true;
  try {
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: config.bucket,
        Policy: buildPublicReadPolicy(config.bucket),
      }),
    );
  } catch (error) {
    // The bucket is reachable and writable; only anonymous reads are at risk, so
    // this is a warning rather than a failed init.
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

/**
 * Uploads `body` under `key` and returns the URL it is readable at.
 */
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

/** Uploads a character image and returns its public URL. */
export async function uploadImage(
  characterId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  return uploadFile(imageKey(characterId, filename), buffer, "image/webp");
}

/** Uploads a character voice note and returns its public URL. */
export async function uploadAudio(
  characterId: string,
  filename: string,
  buffer: Buffer | Uint8Array,
): Promise<string> {
  return uploadFile(audioKey(characterId, filename), buffer, "audio/mpeg");
}

/** Removes an object. Deleting a key that was never there is not an error. */
export async function deleteFile(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getStorageConfig().bucket, Key: key }),
  );
}
