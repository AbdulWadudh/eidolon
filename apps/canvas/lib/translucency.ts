import { clamp } from "es-toolkit";

const MAX_SURFACE_TRANSPARENCY = 0.75;
const MAX_OVERLAY_TRANSPARENCY = 0.15;
const MAX_BLUR_INTENSITY = 80;
const MAX_BLUR_RADIUS_PX = 24;

export function normalizedTranslucency(translucency: number): number {
  return clamp(Number.isFinite(translucency) ? translucency : 0, 0, 100) / 100;
}

export function isTranslucent(translucency: number): boolean {
  return normalizedTranslucency(translucency) > 0;
}

export function surfaceAlpha(translucency: number): number {
  const alpha = 1 - normalizedTranslucency(translucency) * MAX_SURFACE_TRANSPARENCY;
  return Math.round(alpha * 1000) / 1000;
}

export function overlayAlpha(translucency: number): number {
  const alpha = 1 - normalizedTranslucency(translucency) * MAX_OVERLAY_TRANSPARENCY;
  return Math.round(alpha * 1000) / 1000;
}

export function blurIntensity(translucency: number): number {
  return Math.round(normalizedTranslucency(translucency) * MAX_BLUR_INTENSITY);
}

export function blurRadiusPx(translucency: number): number {
  return Math.round(normalizedTranslucency(translucency) * MAX_BLUR_RADIUS_PX);
}

function expandShorthand(hex: string): string {
  return hex.length === 3
    ? hex
        .split("")
        .map((char) => char + char)
        .join("")
    : hex;
}

export function withAlpha(color: string, alpha: number): string {
  const target = clamp(alpha, 0, 1);
  if (target >= 1) return color;

  const raw = color.trim();
  if (!raw.startsWith("#")) return raw;

  const hex = expandShorthand(raw.slice(1));
  if (hex.length !== 6 && hex.length !== 8) return raw;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) return raw;

  const existing = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  const combined = Math.round(existing * target * 1000) / 1000;
  return `rgba(${red}, ${green}, ${blue}, ${combined})`;
}
