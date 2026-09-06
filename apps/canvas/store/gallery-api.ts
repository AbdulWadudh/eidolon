import { characterGalleryUrl, charactersUrl, GALLERY, TIMEOUTS_MS } from "@eidolon/config";

export type GalleryKind = "photo" | "portrait" | "backdrop";

export interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  kind: GalleryKind;
  createdAt: number;
  /** True for the portrait currently in use as her profile picture. */
  isAvatar: boolean;
}

export interface GalleryPage {
  images: GalleryImage[];
  total: number;
}

const EMPTY: GalleryPage = { images: [], total: 0 };

export async function fetchGallery(
  host: string,
  characterId: string,
  offset = 0,
  limit = GALLERY.pageSize,
): Promise<GalleryPage> {
  if (!host) return EMPTY;

  try {
    const res = await fetch(characterGalleryUrl(host, characterId, { limit, offset }), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!res.ok) return EMPTY;

    const body = (await res.json()) as Partial<GalleryPage>;
    return { images: body.images ?? [], total: body.total ?? 0 };
  } catch {
    return EMPTY;
  }
}

/**
 * Appends a page, dropping anything already held. The same image can arrive
 * twice when a new photo lands between two requests and shifts the offset.
 */
export function mergePage(held: GalleryImage[], incoming: GalleryImage[]): GalleryImage[] {
  const seen = new Set(held.map((image) => image.id));
  return [...held, ...incoming.filter((image) => !seen.has(image.id))];
}

/** Puts an existing picture back in use as her profile picture. */
export async function setAvatar(host: string, characterId: string, url: string): Promise<boolean> {
  if (!host) return false;

  try {
    const res = await fetch(`${charactersUrl(host)}/${characterId}/avatar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Removes a portrait for good. Photos are removed from their conversation. */
export async function deleteGalleryImage(
  host: string,
  characterId: string,
  imageId: string,
): Promise<boolean> {
  if (!host) return false;

  try {
    const res = await fetch(
      `${charactersUrl(host)}/${characterId}/gallery/${encodeURIComponent(imageId)}`,
      { method: "DELETE", signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest) },
    );
    return res.ok;
  } catch {
    return false;
  }
}
