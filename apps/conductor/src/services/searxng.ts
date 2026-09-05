/**
 * Search backend, supplied by the environment. No host is baked in: the
 * instance is deployment-specific, so an empty value simply disables search
 * rather than sending queries somewhere the operator never chose.
 */
export const SEARXNG_URL = process.env.SEARXNG_URL ?? "";

export interface SearchResultItem {
  title: string;
  content: string;
  url: string;
}

interface CacheEntry {
  results: SearchResultItem[];
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
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

  // Unset means "no search backend for this deployment", which is a supported
  // configuration - not an error worth a warning on every turn.
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
    const timeout = setTimeout(() => controller.abort(), 4000);

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
    };

    const rawResults = data.results || [];
    const topResults: SearchResultItem[] = rawResults.slice(0, 3).map((item) => ({
      title: item.title ?? "Untitled",
      content: item.content ?? "",
      url: item.url ?? "",
    }));

    // Cache the successful results for 1 hour
    searchCache.set(normalizedQuery, {
      results: topResults,
      expiresAt: now + CACHE_TTL_MS,
    });

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
