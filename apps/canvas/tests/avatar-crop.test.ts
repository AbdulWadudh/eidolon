import { describe, expect, it } from "bun:test";
import { avatarImageProps, croppedStyle, usableCrop } from "@/lib/avatar-crop";
import type { AvatarCropRect } from "@/store/chat-photos";

function framed(
  shown: { width: number; height: number },
  circle: number,
  zoom: number,
  dragX: number,
  dragY: number,
): AvatarCropRect {
  const width = shown.width * zoom;
  const height = shown.height * zoom;
  return {
    cx: 0.5 - dragX / width,
    cy: 0.5 - dragY / height,
    widthRatio: width / circle,
    heightRatio: height / circle,
  };
}

const PHOTO = { width: 300, height: 440 };
const CIRCLE = 264;
const AVATAR = 38;

describe("what the ring framed is what the avatar shows", () => {
  it("puts the centre of the photo in the middle when nothing was moved", () => {
    const drawn = croppedStyle(framed(PHOTO, CIRCLE, 1, 0, 0), AVATAR);

    expect(drawn.left + drawn.width / 2).toBeCloseTo(AVATAR / 2, 5);
    expect(drawn.top + drawn.height / 2).toBeCloseTo(AVATAR / 2, 5);
  });

  it("keeps the photo's shape, so nothing is squashed", () => {
    const drawn = croppedStyle(framed(PHOTO, CIRCLE, 1.7, 40, -25), AVATAR);

    expect(drawn.width / drawn.height).toBeCloseTo(PHOTO.width / PHOTO.height, 5);
  });

  it("moves the framed point to the middle of the avatar", () => {
    const rect = framed(PHOTO, CIRCLE, 1, 12, 0);
    const drawn = croppedStyle(rect, AVATAR);

    expect(drawn.left + rect.cx * drawn.width).toBeCloseTo(AVATAR / 2, 5);
  });

  it("pulls the frame back when it was dragged past what the photo covers", () => {
    const rect = framed(PHOTO, CIRCLE, 1, 60, 0);
    const drawn = croppedStyle(rect, AVATAR);

    expect(drawn.left + rect.cx * drawn.width).toBeLessThan(AVATAR / 2);
    expect(drawn.left).toBeCloseTo(0, 5);
  });

  it("gives the same crop from a phone twice the size", () => {
    const small = framed(PHOTO, CIRCLE, 1.3, 30, 10);
    const large = framed(
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

describe("no crop ever leaves the circle showing through", () => {
  const covers = (rect: AvatarCropRect) => {
    const drawn = croppedStyle(rect, AVATAR);
    return (
      drawn.left <= 1e-9 &&
      drawn.top <= 1e-9 &&
      drawn.left + drawn.width >= AVATAR - 1e-9 &&
      drawn.top + drawn.height >= AVATAR - 1e-9
    );
  };

  it("fills the avatar when the photo was dragged far past its own edge", () => {
    expect(covers(framed(PHOTO, CIRCLE, 1, 4000, 4000))).toBe(true);
    expect(covers(framed(PHOTO, CIRCLE, 1, -4000, -4000))).toBe(true);
  });

  it("fills the avatar when the saved photo was smaller than the ring", () => {
    expect(covers({ cx: 0.5, cy: 0.5, widthRatio: 0.35, heightRatio: 0.2 })).toBe(true);
  });

  it("still fills it when the framed point sits on the very edge", () => {
    expect(covers({ cx: 0, cy: 1, widthRatio: 2, heightRatio: 2 })).toBe(true);
  });

  it("leaves a crop that already covers the circle exactly where it was", () => {
    const rect = framed(PHOTO, CIRCLE, 1.4, 12, -8);
    const drawn = croppedStyle(rect, AVATAR);

    expect(drawn.width).toBeCloseTo(AVATAR * rect.widthRatio, 5);
    expect(drawn.left).toBeCloseTo(AVATAR / 2 - rect.cx * drawn.width, 5);
  });
});

describe("a photo with no crop saved", () => {
  it("is asked to cover the circle from the top, where the face is", () => {
    const props = avatarImageProps(null, AVATAR);

    expect(props.contentFit).toBe("cover");
    expect(props.contentPosition).toBe("top");
  });

  it("treats a half-written crop as no crop at all", () => {
    expect(usableCrop({ cx: 0.5, cy: Number.NaN, widthRatio: 1, heightRatio: 1 })).toBeNull();
    expect(usableCrop({ cx: 0.5, cy: 0.5, widthRatio: 0, heightRatio: 1 })).toBeNull();
    expect(
      avatarImageProps({ cx: 0.5, cy: 0.5, widthRatio: 0, heightRatio: 1 }, AVATAR).contentFit,
    ).toBe("cover");
  });
});
