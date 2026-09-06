import { describe, expect, it } from "bun:test";

// What the cropper writes down, given a photo laid out `shown` big on screen,
// a circle of `circle` at the screen centre, and a drag and pinch.
function crop(
  shown: { width: number; height: number },
  circle: number,
  zoom: number,
  dragX: number,
  dragY: number,
) {
  const width = shown.width * zoom;
  const height = shown.height * zoom;
  return {
    cx: 0.5 - dragX / width,
    cy: 0.5 - dragY / height,
    widthRatio: width / circle,
    heightRatio: height / circle,
  };
}

// What the avatar draws from it: the photo's box, and where its top left corner
// goes, inside a container of `avatar` px.
function rebuild(rect: ReturnType<typeof crop>, avatar: number) {
  const width = avatar * rect.widthRatio;
  const height = avatar * rect.heightRatio;
  return {
    width,
    height,
    left: avatar / 2 - rect.cx * width,
    top: avatar / 2 - rect.cy * height,
  };
}

const PHOTO = { width: 300, height: 440 };
const CIRCLE = 264;

describe("what the ring framed is what the avatar shows", () => {
  it("puts the centre of the photo in the middle when nothing was moved", () => {
    const drawn = rebuild(crop(PHOTO, CIRCLE, 1, 0, 0), 38);

    expect(drawn.left + drawn.width / 2).toBeCloseTo(19, 5);
    expect(drawn.top + drawn.height / 2).toBeCloseTo(19, 5);
  });

  it("keeps the photo's shape, so nothing is squashed", () => {
    const drawn = rebuild(crop(PHOTO, CIRCLE, 1.7, 40, -25), 38);

    expect(drawn.width / drawn.height).toBeCloseTo(PHOTO.width / PHOTO.height, 5);
  });

  it("makes the circle exactly as wide as the avatar", () => {
    const zoom = 1.4;
    const drawn = rebuild(crop(PHOTO, CIRCLE, zoom, 0, 0), 38);

    expect(drawn.width * (CIRCLE / (PHOTO.width * zoom))).toBeCloseTo(38, 5);
  });

  it("moves the framed point to the middle of the avatar", () => {
    const dragX = 60;
    const rect = crop(PHOTO, CIRCLE, 1, dragX, 0);
    const drawn = rebuild(rect, 38);

    // The point of the photo under the ring, expressed 0..1 across the photo.
    const framed = rect.cx;
    expect(drawn.left + framed * drawn.width).toBeCloseTo(19, 5);
  });

  it("gives the same crop from a phone twice the size", () => {
    const small = crop(PHOTO, CIRCLE, 1.3, 30, 10);
    const large = crop(
      { width: PHOTO.width * 2, height: PHOTO.height * 2 },
      CIRCLE * 2,
      1.3,
      60,
      20,
    );

    expect(large.cx).toBeCloseTo(small.cx, 5);
    expect(large.cy).toBeCloseTo(small.cy, 5);
    expect(large.widthRatio).toBeCloseTo(small.widthRatio, 5);
  });
});
