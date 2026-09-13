import { MEDIA_PREVIEW } from "@eidolon/config";

export type MediaKind = "image" | "audio" | "text";

const URL_LIKE = /^(https?:\/\/|\/)/i;

export function isUrlLike(value: string): boolean {
  return URL_LIKE.test(value.trim());
}

export function pathOf(value: string): string {
  const trimmed = value.trim();
  const withoutHash = trimmed.split("#")[0] ?? "";
  return (withoutHash.split("?")[0] ?? "").toLowerCase();
}

function endsWithAny(path: string, extensions: readonly string[]): boolean {
  return extensions.some((extension) => path.endsWith(extension));
}

export function mediaKindFor(value: string): MediaKind {
  if (!isUrlLike(value)) return "text";

  const path = pathOf(value);
  if (endsWithAny(path, MEDIA_PREVIEW.imageExtensions)) return "image";
  if (endsWithAny(path, MEDIA_PREVIEW.audioExtensions)) return "audio";
  return "text";
}

export function filenameOf(value: string): string {
  const path = pathOf(value);
  const last = path.split("/").filter(Boolean).at(-1);
  return last ?? value;
}
