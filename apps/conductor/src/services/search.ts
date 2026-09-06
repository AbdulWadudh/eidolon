import { SEARCH, TIMEOUTS_MS } from "@eidolon/config";
import { search as duckDuckGoSearch, SafeSearchType } from "duck-duck-scrape";

export interface SearchResultItem {
  title: string;
  summary: string;
  url: string;
}

interface CacheEntry {
  context: string;
  expiresAt: number;
}

const CACHE_TTL_MS = SEARCH.cacheTtlMs;
const RESULT_LIMIT = SEARCH.resultLimit;
const searchCache = new Map<string, CacheEntry>();

export function clearSearchCache(): void {
  searchCache.clear();
}

export function getSearchCacheSize(): number {
  return searchCache.size;
}

function clean(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function toItem(
  title: string | undefined,
  summary: string | undefined,
  url: string | undefined,
): SearchResultItem {
  return { title: title ?? "", summary: summary ?? "", url: url?.trim() ?? "" };
}

export function formatSearchResults(results: SearchResultItem[]): string {
  const lines = results
    .map((item) => ({ title: clean(item.title), summary: clean(item.summary) }))
    .filter((item) => item.title.length > 0 || item.summary.length > 0)
    .map((item) => `- Title: ${item.title || "Untitled"}\n  Summary: ${item.summary}`);

  if (lines.length === 0) return "";

  return `[Real-Time Web Reference Information]:\n${lines.join("\n")}`;
}

function warn(message: string): void {
  console.warn(message);
}

async function fromDuckDuckGo(query: string): Promise<SearchResultItem[]> {
  const response = await duckDuckGoSearch(
    query,
    { safeSearch: SafeSearchType.MODERATE },
    { response_timeout: TIMEOUTS_MS.search },
  );

  if (response.noResults) return [];

  return response.results
    .slice(0, RESULT_LIMIT)
    .map((item) => toItem(item.title, item.description, item.url));
}

async function fromSerper(query: string): Promise<SearchResultItem[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: RESULT_LIMIT }),
    signal: AbortSignal.timeout(TIMEOUTS_MS.search),
  });

  if (!res.ok) {
    throw new Error(`Serper returned status ${res.status}`);
  }

  const data = (await res.json()) as {
    organic?: Array<{ title?: string; snippet?: string; link?: string }>;
  };

  return (data.organic ?? [])
    .slice(0, RESULT_LIMIT)
    .map((item) => toItem(item.title, item.snippet, item.link));
}

async function fromExa(query: string): Promise<SearchResultItem[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      numResults: RESULT_LIMIT,
      contents: { text: { maxCharacters: 300 } },
    }),
    signal: AbortSignal.timeout(TIMEOUTS_MS.search),
  });

  if (!res.ok) {
    throw new Error(`Exa returned status ${res.status}`);
  }

  const data = (await res.json()) as {
    results?: Array<{ title?: string; text?: string; url?: string }>;
  };

  return (data.results ?? [])
    .slice(0, RESULT_LIMIT)
    .map((item) => toItem(item.title, item.text, item.url));
}

export async function searchWeb(query: string): Promise<string> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return "";

  const now = Date.now();
  const cached = searchCache.get(normalizedQuery);
  if (cached && cached.expiresAt > now) {
    return cached.context;
  }

  const tiers: Array<{ name: string; run: () => Promise<SearchResultItem[]>; onEmpty: string }> = [
    {
      name: "duck-duck-scrape",
      run: () => fromDuckDuckGo(query),
      onEmpty: "[Search] DuckDuckGo failed, falling back to Serper...",
    },
    {
      name: "serper",
      run: () => fromSerper(query),
      onEmpty: "[Search] Serper failed or is unconfigured, falling back to Exa...",
    },
    {
      name: "exa",
      run: () => fromExa(query),
      onEmpty: "[Search] Exa failed or is unconfigured. Continuing without web context.",
    },
  ];

  for (const tier of tiers) {
    let results: SearchResultItem[] = [];
    try {
      results = await tier.run();
    } catch (error) {
      warn(
        `${tier.onEmpty} (${tier.name}: ${error instanceof Error ? error.message : String(error)})`,
      );
      continue;
    }

    const context = formatSearchResults(results);
    if (context.length === 0) {
      warn(tier.onEmpty);
      continue;
    }

    searchCache.set(normalizedQuery, { context, expiresAt: now + CACHE_TTL_MS });
    return context;
  }

  return "";
}
