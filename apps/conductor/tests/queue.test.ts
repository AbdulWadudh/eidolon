import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  QUEUE_CONCURRENCY,
  QUEUE_JOBS,
  QUEUE_NAMES,
  QUEUE_PREFIXES,
  QUEUE_RETENTION,
  QUEUE_UPLOAD_RETRY,
} from "@eidolon/config";
import { type Job, Queue, Worker } from "bullmq";
import { buildQueueConnection, describeQueueConnection, queueConnection } from "@/queue/connection";
import { gpuQueue, proactiveQueue, s3UploadQueue } from "@/queue/queues";
import type { MediaUploadJob, S3UploadJob, S3UploadJobData, S3UploadJobName } from "@/queue/types";
import { processUploadJob } from "@/queue/workers/s3-worker";

const PROBE_FILENAME = "queue-test-probe.webp";
const PROBE_TIMEOUT_MS = 15000;
const TEST_PREFIX = "{eidolon-s3-upload-test}";
const REACHABILITY_TIMEOUT_MS = 3000;

describe("queue connection", () => {
  it("forces maxRetriesPerRequest to null, as BullMQ requires", () => {
    expect(buildQueueConnection("redis://127.0.0.1:6379").maxRetriesPerRequest).toBeNull();
  });

  it("reuses the Dragonfly URL rather than inventing its own host", () => {
    const parsed = buildQueueConnection("redis://user:pw@cache.internal:6380/2");
    expect(parsed.host).toBe("cache.internal");
    expect(parsed.port).toBe(6380);
    expect(parsed.username).toBe("user");
    expect(parsed.password).toBe("pw");
    expect(parsed.db).toBe(2);
  });

  it("falls back to the default port when the URL omits one", () => {
    expect(buildQueueConnection("redis://127.0.0.1").port).toBe(6379);
  });
});

describe("queue definitions", () => {
  it("names the three queues as the client and dashboard expect", () => {
    expect(gpuQueue.name).toBe(QUEUE_NAMES.gpu);
    expect(s3UploadQueue.name).toBe(QUEUE_NAMES.s3Upload);
    expect(proactiveQueue.name).toBe(QUEUE_NAMES.proactive);
  });

  it("gives every queue its own Dragonfly hashtag so they land on separate threads", () => {
    const prefixes = [QUEUE_PREFIXES.gpu, QUEUE_PREFIXES.s3Upload, QUEUE_PREFIXES.proactive];
    expect(new Set(prefixes).size).toBe(prefixes.length);
    for (const prefix of prefixes) {
      expect(prefix).toMatch(/^\{.+\}$/);
    }
  });

  it("keeps the GPU worker serialized so two renders cannot share the VRAM", () => {
    expect(QUEUE_CONCURRENCY.gpu).toBe(1);
  });

  it("retries uploads with exponential backoff", () => {
    const options = s3UploadQueue.defaultJobOptions;
    expect(options.attempts).toBe(QUEUE_UPLOAD_RETRY.attempts);
    expect(options.backoff).toEqual({
      type: QUEUE_UPLOAD_RETRY.backoffType,
      delay: QUEUE_UPLOAD_RETRY.backoffDelayMs,
    });
  });

  it("caps job retention on the GPU queue", () => {
    expect(gpuQueue.defaultJobOptions.removeOnComplete).toBe(QUEUE_RETENTION.removeOnComplete);
    expect(gpuQueue.defaultJobOptions.removeOnFail).toBe(QUEUE_RETENTION.removeOnFail);
  });
});

describe("s3 upload queue round trip", () => {
  const testQueue = new Queue<S3UploadJobData, string | null, S3UploadJobName>(
    QUEUE_NAMES.s3Upload,
    {
      connection: queueConnection(),
      prefix: TEST_PREFIX,
      defaultJobOptions: s3UploadQueue.defaultJobOptions,
    },
  );

  let reachable = false;

  beforeAll(async () => {
    const unreachable = new Promise<false>((resolve) => {
      setTimeout(() => resolve(false), REACHABILITY_TIMEOUT_MS);
    });

    reachable = await Promise.race([
      testQueue
        .getJobCounts()
        .then(() => true)
        .catch(() => false),
      unreachable,
    ]);

    if (reachable) await testQueue.obliterate({ force: true });
  });

  afterAll(async () => {
    if (reachable) await testQueue.obliterate({ force: true }).catch(() => undefined);
    await testQueue.close().catch(() => undefined);
  });

  it(
    "hands an enqueued job to a worker with its payload intact",
    async () => {
      if (!reachable) {
        throw new Error(
          `Dragonfly is not reachable at ${describeQueueConnection()}. Start it with "bun run storage:up".`,
        );
      }

      const payload: MediaUploadJob = {
        characterId: "queue-test",
        filename: PROBE_FILENAME,
        bufferBase64: Buffer.from("eidolon").toString("base64"),
        messageId: "queue-test-message",
      };

      let worker: Worker<S3UploadJobData, string | null, S3UploadJobName> | null = null;

      const seen = new Promise<Job<S3UploadJobData, string | null, S3UploadJobName>>(
        (resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("the worker never picked the job up")),
            PROBE_TIMEOUT_MS,
          );

          worker = new Worker<S3UploadJobData, string | null, S3UploadJobName>(
            QUEUE_NAMES.s3Upload,
            async (job) => {
              clearTimeout(timer);
              resolve(job);
              return null;
            },
            {
              connection: queueConnection(),
              prefix: TEST_PREFIX,
              concurrency: QUEUE_CONCURRENCY.s3Upload,
            },
          );

          worker.on("error", (error) => {
            clearTimeout(timer);
            reject(error);
          });
        },
      );

      try {
        const job = await testQueue.add(QUEUE_JOBS.uploadImage, payload, { attempts: 1 });
        expect(job.id).toBeTruthy();

        const processed = await seen;
        expect(processed.name).toBe(QUEUE_JOBS.uploadImage);
        expect(processed.id).toBe(job.id);
        expect(processed.data).toEqual(payload);
      } finally {
        await (worker as Worker<S3UploadJobData, string | null, S3UploadJobName> | null)?.close();
      }
    },
    PROBE_TIMEOUT_MS + 5000,
  );

  it("refuses an upload carrying an empty buffer rather than writing a zero byte object", async () => {
    const job = {
      id: "empty",
      name: QUEUE_JOBS.uploadImage,
      data: { characterId: "queue-test", filename: PROBE_FILENAME, bufferBase64: "" },
    } as S3UploadJob;

    expect(processUploadJob(job)).rejects.toThrow();
  });
});
