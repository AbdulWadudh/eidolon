import { describe, expect, it } from "bun:test";
import { countFor, isPending, PENDING_TAB, QUEUE_TABS } from "../lib/queue-tabs";

const queue = {
  key: "gpu",
  name: "eidolon-gpu",
  reachable: true,
  counts: { waiting: 2, active: 1, delayed: 3, failed: 4, completed: 90 },
  jobs: [],
};

describe("the queue state tabs", () => {
  it("offers every state plus one that gathers the open ones", () => {
    expect(QUEUE_TABS).toEqual([
      PENDING_TAB,
      "active",
      "waiting",
      "delayed",
      "failed",
      "completed",
    ]);
  });

  it("counts everything except completed under the open tab", () => {
    expect(countFor(queue, PENDING_TAB)).toBe(10);
  });

  it("leaves the completed count out of the open tab entirely", () => {
    const quiet = { ...queue, counts: { ...queue.counts, completed: 10_000 } };
    expect(countFor(quiet, PENDING_TAB)).toBe(10);
  });

  it("reports each state's own count unchanged", () => {
    expect(countFor(queue, "failed")).toBe(4);
    expect(countFor(queue, "completed")).toBe(90);
    expect(countFor(queue, "active")).toBe(1);
  });

  it("is zero when nothing is open, even with a full completed history", () => {
    const idle = {
      ...queue,
      counts: { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 100 },
    };
    expect(countFor(idle, PENDING_TAB)).toBe(0);
  });

  it("treats every state but completed as open", () => {
    expect(isPending("active")).toBe(true);
    expect(isPending("waiting")).toBe(true);
    expect(isPending("delayed")).toBe(true);
    expect(isPending("failed")).toBe(true);
    expect(isPending("completed")).toBe(false);
  });
});
