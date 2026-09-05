import { describe, expect, it } from "bun:test";
import { CHAT } from "@eidolon/config";
import { isWithinLiveEdge, nextLiveEdge } from "../lib/feed-scroll";

const VIEWPORT = 800;

function frame(distance: number) {
  return { contentHeight: VIEWPORT + distance, viewportHeight: VIEWPORT, offsetY: 0 };
}

describe("live edge", () => {
  it("counts anything inside the threshold as the live edge", () => {
    expect(isWithinLiveEdge(frame(0))).toBe(true);
    expect(isWithinLiveEdge(frame(CHAT.liveEdgeThresholdPx))).toBe(true);
    expect(isWithinLiveEdge(frame(CHAT.liveEdgeThresholdPx + 1))).toBe(false);
  });

  it("keeps following when a reply grows faster than the list can scroll", () => {
    expect(nextLiveEdge(frame(900), false, true)).toBe(true);
  });

  it("stops following when the reader drags away", () => {
    expect(nextLiveEdge(frame(900), true, true)).toBe(false);
  });

  it("rejoins the live edge without a drag once the scroll catches up", () => {
    expect(nextLiveEdge(frame(10), false, false)).toBe(true);
  });

  it("leaves a reader who scrolled up alone while the reply streams", () => {
    expect(nextLiveEdge(frame(2000), false, false)).toBe(false);
  });
});
