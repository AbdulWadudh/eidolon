const PHOTO_LINE = /^\*sends a photo(?: of ([^*]+))?\*$/i;

export const SENT_A_PHOTO = "*sends a photo*";

export function photoLine(caption: string): string {
  return caption.length > 0 ? `*sends a photo of ${caption}*` : SENT_A_PHOTO;
}

export function isPhotoLine(content: string): boolean {
  return PHOTO_LINE.test(content.trim());
}

export function asPhotoNote(content: string): string {
  const match = PHOTO_LINE.exec(content.trim());
  if (!match) return content;
  const caption = match[1]?.trim();
  return caption ? `[photo attached: ${caption}]` : "[photo attached]";
}

export function forHistory(role: string, content: string, imageCaption?: string | null): string {
  if (role !== "assistant") return content;

  const note = imageCaption ? `[photo attached: ${imageCaption}]` : "";
  const spoken = asPhotoNote(content);
  if (note.length === 0) return spoken;
  return spoken.length > 0 && !isPhotoLine(content) ? `${spoken} ${note}` : note;
}
