import { describe, expect, it } from "bun:test";
import { CHAT } from "@eidolon/config";
import { isWithinLiveEdge, nextLiveEdge, trackLiveEdge } from "../lib/feed-scroll";

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

describe("following new content while a jump is in flight", () => {
  const atBottom = { contentHeight: 4000, viewportHeight: 800, offsetY: 3200 };
  const wayUp = { contentHeight: 4000, viewportHeight: 800, offsetY: 400 };

  it("ignores the opening frames of a jump, which start at the bottom", () => {
    // Without this the follow re-armed and carried the reader back down a
    // moment after arriving at the message they asked for.
    expect(trackLiveEdge(atBottom, { isDragging: false, isFocusing: true, current: false })).toBe(
      false,
    );
  });

  it("ignores the frames where the jump has arrived, too", () => {
    expect(trackLiveEdge(wayUp, { isDragging: false, isFocusing: true, current: false })).toBe(
      false,
    );
  });

  it("does not strand a reader who was following before a jump started", () => {
    expect(trackLiveEdge(wayUp, { isDragging: false, isFocusing: true, current: true })).toBe(true);
  });

  it("hands control back once the jump is over", () => {
    expect(trackLiveEdge(wayUp, { isDragging: false, isFocusing: false, current: false })).toBe(
      false,
    );
    expect(trackLiveEdge(atBottom, { isDragging: false, isFocusing: false, current: false })).toBe(
      true,
    );
  });

  it("still lets a drag take the reader off the live edge", () => {
    expect(trackLiveEdge(wayUp, { isDragging: true, isFocusing: false, current: true })).toBe(
      false,
    );
  });
});
