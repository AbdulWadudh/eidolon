import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearSearchCache,
  formatSearchResults,
  getSearchCacheSize,
  searchWeb,
} from "@/services/searxng";

describe("SearXNG Search Client", () => {
  beforeEach(() => {
    clearSearchCache();
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

  it("caches queries in memory to avoid repeated network requests", async () => {
    const query = "test-query-caching-id";
    const firstResults = await searchWeb(query);
    expect(getSearchCacheSize()).toBe(1);

    const secondResults = await searchWeb(query);
    expect(secondResults).toEqual(firstResults);
    expect(getSearchCacheSize()).toBe(1);
  });
});
