import { familyBaseName, loadDynamicFonts } from "@/services/font-registry";
import type { GoogleFontFamily } from "@/services/google-fonts";

export type PreviewState = "loading" | "ready" | "skipped" | "failed";

const HEAVY_SUBSETS = new Set([
  "chinese-simplified",
  "chinese-traditional",
  "chinese-hongkong",
  "japanese",
  "korean",
]);

const MAX_CONCURRENT = 3;
const MAX_PREVIEWS_PER_SESSION = 80;

let active = 0;
let loadedThisSession = 0;
const queue: (() => void)[] = [];
const states = new Map<string, PreviewState>();

export function previewFontName(family: string): string {
  return `${familyBaseName(family)}-Regular`;
}

export function isHeavyFamily(entry: GoogleFontFamily): boolean {
  return (entry.subsets ?? []).some((subset) => HEAVY_SUBSETS.has(subset));
}

function pump(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift();
    if (next) next();
  }
}

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
