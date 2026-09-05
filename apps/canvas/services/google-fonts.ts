import * as FileSystem from "expo-file-system/legacy";

const WEBFONTS_ENDPOINT = "https://www.googleapis.com/webfonts/v1/webfonts";
// Bump when the cached shape changes; a stale file from an older shape would
// otherwise be read back missing fields the UI now depends on.
const CACHE_VERSION = 2;
const CACHE_FILE = `google-fonts-catalogue.v${CACHE_VERSION}.json`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface GoogleFontFamily {
  family: string;
  category: string;
  variants: string[];
  /** Character sets the family covers; CJK subsets mean a very large file. */
  subsets: string[];
  /** Weight/style key -> download URL, e.g. { regular: "...", "700": "...", italic: "..." } */
  files: Record<string, string>;
}

export type FontCatalogueError = "missing-api-key" | "request-failed";

export class GoogleFontsError extends Error {
  readonly reason: FontCatalogueError;
  constructor(reason: FontCatalogueError, message: string) {
    super(message);
    this.name = "GoogleFontsError";
    this.reason = reason;
  }
}

/**
 * Read at call time rather than module scope so a missing key surfaces as a
 * handled UI state instead of a crash during import.
 */
function getApiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_GOOGLE_FONTS_API_KEY;
  return key && key.length > 0 ? key : undefined;
}

export function hasGoogleFontsApiKey(): boolean {
  return getApiKey() !== undefined;
}

/** The API still returns http:// URLs; Android blocks cleartext traffic by default. */
function toHttps(url: string): string {
  return url.startsWith("http://") ? `https://${url.slice("http://".length)}` : url;
}

function normalise(entry: GoogleFontFamily): GoogleFontFamily {
  const files: Record<string, string> = {};
  for (const [variant, url] of Object.entries(entry.files ?? {})) {
    files[variant] = toHttps(url);
  }
  return {
    family: entry.family,
    category: entry.category,
    variants: entry.variants,
    subsets: entry.subsets ?? [],
    files,
  };
}

let memoryCache: GoogleFontFamily[] | null = null;
let inFlight: Promise<GoogleFontFamily[]> | null = null;

function cacheUri(): string | null {
  const baseDir = FileSystem.documentDirectory;
  return baseDir ? `${baseDir}${CACHE_FILE}` : null;
}

async function readDiskCache(): Promise<GoogleFontFamily[] | null> {
  const uri = cacheUri();
  if (!uri) return null;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(raw) as {
      version?: number;
      fetchedAt: number;
      items: GoogleFontFamily[];
    };
    if (parsed?.version !== CACHE_VERSION) return null;
    if (!parsed.items || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

async function writeDiskCache(items: GoogleFontFamily[]): Promise<void> {
  const uri = cacheUri();
  if (!uri) return;
  try {
    await FileSystem.writeAsStringAsync(
      uri,
      JSON.stringify({ version: CACHE_VERSION, fetchedAt: Date.now(), items }),
    );
  } catch {
    // A cold catalogue on next launch is not worth surfacing to the user.
  }
}

/**
 * The whole catalogue arrives in one request (~1800 families), so searching is
 * done client-side. That keeps typing off the network entirely.
 */
export async function fetchFontCatalogue(forceRefresh = false): Promise<GoogleFontFamily[]> {
  if (!forceRefresh && memoryCache) return memoryCache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!forceRefresh) {
      const cached = await readDiskCache();
      if (cached) {
        memoryCache = cached;
        return cached;
      }
    }

    const key = getApiKey();
    if (!key) {
      throw new GoogleFontsError(
        "missing-api-key",
        "Set EXPO_PUBLIC_GOOGLE_FONTS_API_KEY to browse Google Fonts.",
      );
    }

    const url = `${WEBFONTS_ENDPOINT}?sort=popularity&key=${encodeURIComponent(key)}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new GoogleFontsError("request-failed", `Could not reach Google Fonts: ${err}`);
    }
    if (!response.ok) {
      throw new GoogleFontsError(
        "request-failed",
        `Google Fonts responded ${response.status}. Check the API key and that the Web Fonts Developer API is enabled.`,
      );
    }

    const body = (await response.json()) as { items?: GoogleFontFamily[] };
    const items = (body.items ?? []).map(normalise);
    memoryCache = items;
    await writeDiskCache(items);
    return items;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function searchFontCatalogue(
  catalogue: GoogleFontFamily[],
  query: string,
  limit = 60,
): GoogleFontFamily[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return catalogue.slice(0, limit);
  const results: GoogleFontFamily[] = [];
  for (const entry of catalogue) {
    if (entry.family.toLowerCase().includes(trimmed)) {
      results.push(entry);
      if (results.length >= limit) break;
    }
  }
  return results;
}
