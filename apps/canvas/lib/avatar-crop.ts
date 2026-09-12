import type { AvatarCropRect } from "@/store/chat-photos";

export interface CroppedStyle {
  position: "absolute";
  width: number;
  height: number;
  left: number;
  top: number;
}

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

export function usableCrop(crop: AvatarCropRect | null | undefined): AvatarCropRect | null {
  if (!crop || typeof crop.widthRatio !== "number" || typeof crop.heightRatio !== "number") {
    return null;
  }
  return crop;
}
