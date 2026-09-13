import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QUEUE_JOBS } from "@eidolon/config";
import type { GpuJob } from "@/queue/types";
import { isChatPhotoJob, isPortraitJob, isStageBackdropJob } from "@/queue/types";

function asJob(name: string): GpuJob {
  return { name } as GpuJob;
}

describe("a photo asked for in chat outlives the socket that asked for it", () => {
  it("is a gpu job, so it is picked up by a worker rather than a connection", () => {
    expect(isChatPhotoJob(asJob(QUEUE_JOBS.generateChatPhoto))).toBe(true);
  });

  it("is not mistaken for the other work the same queue carries", () => {
    const job = asJob(QUEUE_JOBS.generateChatPhoto);

    expect(isPortraitJob(job)).toBe(false);
    expect(isStageBackdropJob(job)).toBe(false);
  });

  it("leaves the other gpu jobs alone", () => {
    expect(isChatPhotoJob(asJob(QUEUE_JOBS.generatePortrait))).toBe(false);
    expect(isChatPhotoJob(asJob(QUEUE_JOBS.generateStageBackdrop))).toBe(false);
    expect(isChatPhotoJob(asJob(QUEUE_JOBS.summarizeChronicle))).toBe(false);
  });
});

describe("the socket handler cannot paint a photo itself", () => {
  const source = readFileSync(join(import.meta.dir, "../src/ws/image-turn.ts"), "utf-8");
  const handler = source.slice(source.indexOf("export async function handleImageRequest"));

  it("hands the work to the queue rather than doing it on the connection", () => {
    expect(handler).toContain("enqueueGpuJob");
    expect(handler).toContain("QUEUE_JOBS.generateChatPhoto");
  });

  it("never calls the painter, which is what tied a photo to a live socket", () => {
    expect(source).not.toContain("paintSelfie");
  });

  it("takes no abort signal, so a closing socket cannot cancel a photo", () => {
    expect(handler).not.toContain("AbortSignal");
    expect(handler).not.toContain("signal.aborted");
  });
});
