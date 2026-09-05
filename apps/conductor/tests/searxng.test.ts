import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  clearSearchCache,
  formatSearchResults,
  getSearchCacheSize,
  searchWeb,
} from "@/services/searxng";

const originalFetch = globalThis.fetch;

function mockSearch(results: unknown[], unresponsive: [string, string][] = []): () => number {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ results, unresponsive_engines: unresponsive }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return () => calls;
}

describe("SearXNG Search Client", () => {
  beforeEach(() => {
    clearSearchCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("handles empty query gracefully", async () => {
    const results = await searchWeb("");
    expect(results).toEqual([]);
    expect(getSearchCacheSize()).toBe(0);
  });

  it("formats search results cleanly for prompt injection", () => {
    const mockResults = [
      {
        title: "Neon Cybernetics",
        url: "https://example.com/cyber",
        content: "Overview of neural interfaces and glowing accents.",
      },
    ];
    const formatted = formatSearchResults(mockResults);
    expect(formatted).toContain("[Search Results]");
    expect(formatted).toContain("Neon Cybernetics");
    expect(formatted).toContain("https://example.com/cyber");
  });

  it("returns empty string when formatting empty results", () => {
    expect(formatSearchResults([])).toBe("");
  });

  it("caches a hit so the same query is only fetched once", async () => {
    const calls = mockSearch([
      { title: "Result", url: "https://example.com", content: "Something." },
    ]);

    const first = await searchWeb("a cached query");
    expect(first).toHaveLength(1);
    expect(getSearchCacheSize()).toBe(1);

    const second = await searchWeb("a cached query");
    expect(second).toEqual(first);
    expect(calls()).toBe(1);
  });

  it("does not cache an empty answer, so an engine outage is retried", async () => {
    const calls = mockSearch([], [["duckduckgo", "CAPTCHA"]]);

    expect(await searchWeb("a blocked query")).toEqual([]);
    expect(getSearchCacheSize()).toBe(0);

    await searchWeb("a blocked query");
    expect(calls()).toBe(2);
  });

  it("trims to the configured result limit", async () => {
    mockSearch(
      Array.from({ length: 10 }, (_, index) => ({
        title: `Result ${index}`,
        url: `https://example.com/${index}`,
        content: "Body.",
      })),
    );

    expect((await searchWeb("many results")).length).toBeLessThanOrEqual(3);
  });
});
