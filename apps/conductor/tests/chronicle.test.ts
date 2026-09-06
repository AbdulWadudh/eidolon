import { describe, expect, it } from "bun:test";
import { CHRONICLE } from "@eidolon/config";
import { chronicleJobId, isChronicleMilestone } from "@/orchestrator/chronicle";
import { proactiveJobId } from "@/orchestrator/proactive";
import { jobKey } from "@/queue/job-id";
import { shapeOpener } from "@/queue/workers/proactive-worker";
import { toBullets } from "@/services/chronicle-writer";

describe("chronicle bullets", () => {
  it("reads the structured JSON the schema asks for", () => {
    const raw = JSON.stringify({
      bullets: ["She took the Lisbon job.", "He heard it first.", "They agreed to work it out."],
    });
    expect(toBullets(raw)).toEqual([
      "- She took the Lisbon job.",
      "- He heard it first.",
      "- They agreed to work it out.",
    ]);
  });

  it("falls back to lines when the model ignores the schema", () => {
    expect(toBullets("- one\n* two\n1. three")).toEqual(["- one", "- two", "- three"]);
  });

  it("never keeps more bullets than the chronicle asks for", () => {
    const raw = Array.from({ length: 10 }, (_, i) => `- line ${i}`).join("\n");
    expect(toBullets(raw)).toHaveLength(CHRONICLE.bulletCount);
  });

  it("truncates a bullet that runs past the limit", () => {
    const [bullet] = toBullets(`- ${"x".repeat(CHRONICLE.maxBulletChars * 2)}`);
    expect((bullet ?? "").length).toBeLessThanOrEqual(CHRONICLE.maxBulletChars + 2);
  });

  it("drops empty output rather than writing a blank entry", () => {
    expect(toBullets("   \n\n  ")).toEqual([]);
  });
});

describe("chronicle milestones", () => {
  it("fires on multiples of the batch size and nowhere else", () => {
    expect(isChronicleMilestone(0)).toBe(false);
    expect(isChronicleMilestone(CHRONICLE.batchSize - 1)).toBe(false);
    expect(isChronicleMilestone(CHRONICLE.batchSize)).toBe(true);
    expect(isChronicleMilestone(CHRONICLE.batchSize * 3)).toBe(true);
  });
});

describe("job keys", () => {
  it("never emits a colon, which BullMQ reserves for repeatable jobs", () => {
    for (const key of [
      jobKey("backdrop", "aria:main", "the rooftop"),
      chronicleJobId("aria", 30),
      proactiveJobId("aria"),
    ]) {
      expect(key).not.toContain(":");
    }
  });

  it("stays deterministic for the same inputs", () => {
    expect(chronicleJobId("aria", 30)).toBe(chronicleJobId("aria", 30));
    expect(chronicleJobId("aria", 30)).not.toBe(chronicleJobId("aria", 60));
  });
});

describe("proactive openers", () => {
  it("collapses whitespace and caps the length", () => {
    expect(shapeOpener("  *waves*   hey   you  ")).toBe("*waves* hey you");
    expect(shapeOpener("y".repeat(1000)).length).toBeLessThanOrEqual(240);
  });
});
