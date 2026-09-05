import { SEARCH, TIMEOUTS_MS } from "@eidolon/config";
import { getServicesConfig } from "@eidolon/config/server";

export const SEARXNG_URL = getServicesConfig().searxngUrl;

export interface SearchResultItem {
  title: string;
  content: string;
  url: string;
}

interface CacheEntry {
  results: SearchResultItem[];
  expiresAt: number;
}

const CACHE_TTL_MS = SEARCH.cacheTtlMs;
const searchCache = new Map<string, CacheEntry>();

/**
 * Clears the in-memory search cache (useful for testing).
 */
export function clearSearchCache(): void {
  searchCache.clear();
}

/**
 * Returns current cache size.
 */
export function getSearchCacheSize(): number {
  return searchCache.size;
}

/**
 * Searches the web via a SearXNG JSON endpoint with in-memory TTL caching.
 * Gracefully returns an empty array on timeout or connection error.
 */
export async function searchWeb(query: string): Promise<SearchResultItem[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  if (!SEARXNG_URL) {
    return [];
  }

  // Check in-memory cache
  const cached = searchCache.get(normalizedQuery);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.results;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS_MS.search);

    const url = `${SEARXNG_URL}/search?q=${encodeURIComponent(normalizedQuery)}&format=json`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`SearXNG returned status ${res.status}`);
    }

    const data = (await res.json()) as {
      results?: Array<{
        title?: string;
        content?: string;
        url?: string;
      }>;
      unresponsive_engines?: Array<[string, string]>;
    };

    const rawResults = data.results || [];
    const blocked = data.unresponsive_engines ?? [];

    if (rawResults.length === 0 && blocked.length > 0) {
      console.warn(
        `[SearXNG Client] No results for "${query}" because every engine refused: ` +
          `${blocked.map(([engine, reason]) => `${engine} (${reason})`).join(", ")}. ` +
          "This is the SearXNG instance, not the conductor. Enable engines that do not rate-limit.",
      );
    }
    const topResults: SearchResultItem[] = rawResults.slice(0, SEARCH.resultLimit).map((item) => ({
      title: item.title ?? "Untitled",
      content: item.content ?? "",
      url: item.url ?? "",
    }));

    if (topResults.length > 0) {
      searchCache.set(normalizedQuery, {
        results: topResults,
        expiresAt: now + CACHE_TTL_MS,
      });
    }

    return topResults;
  } catch (error) {
    console.warn(
      `[SearXNG Client] Search query failed for "${query}": ${
        error instanceof Error ? error.message : String(error)
      }. Returning empty results fallback.`,
    );
    return [];
  }
}

/**
 * Formats search results as a clean text block suitable for LLM prompt injection.
 */
export function formatSearchResults(results: SearchResultItem[]): string {
  if (results.length === 0) {
    return "";
  }

  const formatted = results
    .map((r, idx) => `[Result ${idx + 1}] ${r.title}\nURL: ${r.url}\nSummary: ${r.content}`)
    .join("\n\n");

  return `[Search Results]\n${formatted}`;
}
