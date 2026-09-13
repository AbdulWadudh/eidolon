import type { ImageContentFit, ImageContentPosition } from "expo-image";
import type { AvatarCropRect } from "@/store/chat-photos";

export interface CroppedStyle {
  position: "absolute";
  width: number;
  height: number;
  left: number;
  top: number;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export function coveringScale(crop: AvatarCropRect): number {
  return Math.max(1, 1 / crop.widthRatio, 1 / crop.heightRatio);
}

export function croppedStyle(crop: AvatarCropRect, size: number): CroppedStyle {
  const scale = coveringScale(crop);
  const width = size * crop.widthRatio * scale;
  const height = size * crop.heightRatio * scale;

  const cx = clamp(crop.cx, size / (2 * width), 1 - size / (2 * width));
  const cy = clamp(crop.cy, size / (2 * height), 1 - size / (2 * height));

  return {
    position: "absolute",
    width,
    height,
    left: size / 2 - cx * width,
    top: size / 2 - cy * height,
  };
}

export function usableCrop(crop: AvatarCropRect | null | undefined): AvatarCropRect | null {
  if (!crop) return null;

  for (const value of [crop.cx, crop.cy, crop.widthRatio, crop.heightRatio]) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
  }

  return crop.widthRatio > 0 && crop.heightRatio > 0 ? crop : null;
}

export interface AvatarImageProps {
  contentFit: ImageContentFit;
  contentPosition?: ImageContentPosition;
  style: CroppedStyle | { width: "100%"; height: "100%" };
}

export function avatarImageProps(
  crop: AvatarCropRect | null | undefined,
  size: number,
): AvatarImageProps {
  const usable = usableCrop(crop);

  if (usable) return { contentFit: "fill", style: croppedStyle(usable, size) };

  return {
    contentFit: "cover",
    contentPosition: "top",
    style: { width: "100%", height: "100%" },
  };
}
