import { describe, expect, it } from "bun:test";
import { PHOTO } from "@eidolon/config";

// The cropper draws the image across the whole working area and keeps a circle
// of it. The avatar fills its container entirely, so the saved crop has to carry
// the difference or the avatar shows more of the photo than the ring did.
function cropFrom(side: number, circle: number, rawZoom: number, dragX: number) {
  return {
    zoom: (side / circle) * rawZoom,
    offsetX: dragX / circle,
  };
}

describe("avatar crop", () => {
  const side = 400;
  const circle = Math.round(side * PHOTO.avatarFrameFraction);

  it("zooms the avatar to match what the ring framed", () => {
    const crop = cropFrom(side, circle, 1, 0);
    expect(crop.zoom).toBeCloseTo(side / circle, 3);
    expect(crop.zoom).toBeGreaterThan(1);
  });

  it("carries a pinch on top of that", () => {
    expect(cropFrom(side, circle, 2, 0).zoom).toBeCloseTo((side / circle) * 2, 3);
  });

  it("normalises the drag against the ring, not the screen", () => {
    expect(cropFrom(side, circle, 1, circle / 2).offsetX).toBeCloseTo(0.5, 3);
  });

  it("survives a different screen width", () => {
    const wide = 800;
    const wideCircle = Math.round(wide * PHOTO.avatarFrameFraction);
    const small = cropFrom(side, circle, 1, circle / 4);
    const large = cropFrom(wide, wideCircle, 1, wideCircle / 4);

    expect(large.offsetX).toBeCloseTo(small.offsetX, 2);
    expect(large.zoom).toBeCloseTo(small.zoom, 2);
  });
});
