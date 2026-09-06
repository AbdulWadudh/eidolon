import { QUEUE_CONCURRENCY } from "@eidolon/config";
import type { Worker } from "bullmq";
import { describeQueueConnection } from "@/queue/connection";
import { createGpuWorker } from "@/queue/workers/gpu-worker";
import { createProactiveWorker } from "@/queue/workers/proactive-worker";
import { createS3Worker } from "@/queue/workers/s3-worker";

type AnyWorker = Pick<Worker, "close" | "name">;

let running: AnyWorker[] = [];

export function startWorkers(): void {
  if (running.length > 0) return;

  running = [createGpuWorker(), createS3Worker(), createProactiveWorker()];

  console.log(`[Queue] Dragonfly: ${describeQueueConnection()}`);
  console.log(
    `[Queue] Workers up — gpu x${QUEUE_CONCURRENCY.gpu}, ` +
      `s3-upload x${QUEUE_CONCURRENCY.s3Upload}, proactive x${QUEUE_CONCURRENCY.proactive}`,
  );
}

export async function stopWorkers(): Promise<void> {
  const workers = running;
  running = [];
  await Promise.all(workers.map((worker) => worker.close()));
}

export { createGpuWorker, createProactiveWorker, createS3Worker };
