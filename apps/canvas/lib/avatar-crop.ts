import type { AvatarCropRect } from "@/store/chat-photos";

export interface CroppedStyle {
  position: "absolute";
  width: number;
  height: number;
  left: number;
  top: number;
}

/**
 * A crop is stored as a region of the source picture, so the picture is blown up
 * until the region is the avatar's width, then moved so the region's centre
 * lands in the middle. Both ratios come from the same picture, so the box keeps
 * its aspect and "fill" does not distort.
 *
 * Shared because the chat header framed her correctly while the roster and her
 * profile showed the whole uncropped picture squeezed into a circle.
 */
export function croppedStyle(crop: AvatarCropRect, size: number): CroppedStyle {
  const width = size * crop.widthRatio;
  const height = size * crop.heightRatio;

  return {
    position: "absolute",
    width,
    height,
    left: size / 2 - crop.cx * width,
    top: size / 2 - crop.cy * height,
  };
}

/** Crops written before the format changed carry zoom and offsets, not a region. */
export function usableCrop(crop: AvatarCropRect | null | undefined): AvatarCropRect | null {
  if (!crop || typeof crop.widthRatio !== "number" || typeof crop.heightRatio !== "number") {
    return null;
  }
  return crop;
}
