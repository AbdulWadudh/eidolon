import { familyBaseName, loadDynamicFonts } from "@/services/font-registry";
import type { GoogleFontFamily } from "@/services/google-fonts";

export type PreviewState = "loading" | "ready" | "skipped" | "failed";

/**
 * CJK families ship 5-20MB per face. Downloading those just to draw a one-line
 * sample would burn the user's data as they scroll, so they are shown as
 * metadata only and downloaded on demand when actually chosen.
 */
const HEAVY_SUBSETS = new Set([
  "chinese-simplified",
  "chinese-traditional",
  "chinese-hongkong",
  "japanese",
  "korean",
]);

/** Only a handful of files should be in flight while the list is scrolling. */
const MAX_CONCURRENT = 3;
/** Bound on how much a single browsing session can pull down. */
const MAX_PREVIEWS_PER_SESSION = 80;

let active = 0;
let loadedThisSession = 0;
const queue: (() => void)[] = [];
const states = new Map<string, PreviewState>();

/**
 * Preview faces register under the same name a real install would use, so
 * choosing a previewed family reuses the already-downloaded regular weight
 * instead of fetching it twice.
 */
export function previewFontName(family: string): string {
  return `${familyBaseName(family)}-Regular`;
}

export function isHeavyFamily(entry: GoogleFontFamily): boolean {
  // Defensive: a catalogue cached before `subsets` existed has no such field.
  return (entry.subsets ?? []).some((subset) => HEAVY_SUBSETS.has(subset));
}

function pump(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift();
    if (next) next();
  }
}

/**
 * Loads just the regular weight so the row can be drawn in its own face.
 * Returns the resulting state; repeated calls for the same family are cheap.
 */
export function loadFontPreview(entry: GoogleFontFamily): Promise<PreviewState> {
  const existing = states.get(entry.family);
  if (existing === "ready" || existing === "skipped" || existing === "failed") {
    return Promise.resolve(existing);
  }
  if (existing === "loading") return Promise.resolve("loading");

  if (isHeavyFamily(entry) || loadedThisSession >= MAX_PREVIEWS_PER_SESSION) {
    states.set(entry.family, "skipped");
    return Promise.resolve("skipped");
  }

  const regular = entry.files.regular ?? entry.files["400"] ?? Object.values(entry.files)[0];
  if (!regular) {
    states.set(entry.family, "skipped");
    return Promise.resolve("skipped");
  }

  states.set(entry.family, "loading");

  return new Promise<PreviewState>((resolve) => {
    queue.push(() => {
      active += 1;
      loadDynamicFonts({ [previewFontName(entry.family)]: regular })
        .then(() => {
          loadedThisSession += 1;
          states.set(entry.family, "ready");
          resolve("ready");
        })
        .catch(() => {
          states.set(entry.family, "failed");
          resolve("failed");
        })
        .finally(() => {
          active -= 1;
          pump();
        });
    });
    pump();
  });
}

export function getPreviewState(family: string): PreviewState | undefined {
  return states.get(family);
}
