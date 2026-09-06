import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

interface DuckResult {
  title: string;
  description: string;
  url: string;
  hostname: string;
  rawDescription: string;
  icon: string;
}

let duckCalls = 0;
let duckHandler: () => Promise<{ noResults: boolean; vqd: string; results: DuckResult[] }> =
  async () => ({
    noResults: true,
    vqd: "",
    results: [],
  });

function duckResult(title: string, description: string, url: string): DuckResult {
  return {
    title,
    description,
    url,
    hostname: "example.com",
    rawDescription: description,
    icon: "",
  };
}

function duckReturns(results: DuckResult[]): void {
  duckHandler = async () => ({ noResults: results.length === 0, vqd: "vqd", results });
}

function duckThrows(message: string): void {
  duckHandler = async () => {
    throw new Error(message);
  };
}

mock.module("duck-duck-scrape", () => ({
  SafeSearchType: { STRICT: 0, MODERATE: -1, OFF: -2 },
  search: async () => {
    duckCalls += 1;
    return duckHandler();
  },
}));

const { clearSearchCache, formatSearchResults, getSearchCacheSize, searchWeb } = await import(
  "@/services/search"
);
const { shouldSearchWeb } = await import("@/orchestrator/search-trigger");

const originalFetch = globalThis.fetch;
const originalSerper = process.env.SERPER_API_KEY;
const originalExa = process.env.EXA_API_KEY;

function setKey(name: "SERPER_API_KEY" | "EXA_API_KEY", value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function mockFetch(handler: (url: string) => Response | Promise<Response>): () => number {
  let calls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls += 1;
    return handler(String(input));
  }) as unknown as typeof fetch;
  return () => calls;
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Multi-tier web search", () => {
  beforeEach(() => {
    clearSearchCache();
    duckCalls = 0;
    duckReturns([]);
    setKey("SERPER_API_KEY", undefined);
    setKey("EXA_API_KEY", undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setKey("SERPER_API_KEY", originalSerper);
    setKey("EXA_API_KEY", originalExa);
  });

  it("serves an identical query from the in-memory cache without touching the network", async () => {
    duckReturns([duckResult("Mars Rover", "Perseverance is still rolling.", "https://nasa.gov")]);
    const fetchCalls = mockFetch(() => json({}));

    const first = await searchWeb("What is the Mars rover doing?");
    expect(first).toContain("Perseverance is still rolling.");
    expect(duckCalls).toBe(1);
    expect(getSearchCacheSize()).toBe(1);

    const second = await searchWeb("what is the mars rover doing?");
    expect(second).toBe(first);
    expect(duckCalls).toBe(1);
    expect(fetchCalls()).toBe(0);
  });

  it("formats results into a clean reference block with no HTML tags", () => {
    const formatted = formatSearchResults([
      {
        title: "<b>Neon</b> Cybernetics",
        summary: "Overview of <b>neural</b> interfaces &amp; glowing   accents.",
        url: "https://example.com/cyber",
      },
      { title: "Second Source", summary: "A shorter note.", url: "https://example.com/two" },
    ]);

    expect(formatted).toStartWith("[Real-Time Web Reference Information]:");
    expect(formatted).toContain("- Title: Neon Cybernetics");
    expect(formatted).toContain("  Summary: Overview of neural interfaces & glowing accents.");
    expect(formatted).toContain("- Title: Second Source");
    expect(formatted).not.toContain("<b>");
    expect(formatted).not.toContain("&amp;");
  });

  it("returns an empty string when every provider is offline or unconfigured", async () => {
    duckThrows("socket hang up");
    const fetchCalls = mockFetch(() => {
      throw new Error("network unreachable");
    });

    expect(await searchWeb("who is offline right now")).toBe("");
    expect(fetchCalls()).toBe(0);
    expect(getSearchCacheSize()).toBe(0);
  });

  it("falls back to Serper when DuckDuckGo throws", async () => {
    duckThrows("DDG rate limited");
    setKey("SERPER_API_KEY", "serper-test-key");
    const fetchCalls = mockFetch((url) => {
      expect(url).toBe("https://google.serper.dev/search");
      return json({
        organic: [
          { title: "Serper Hit", snippet: "From Google.", link: "https://example.com/serper" },
        ],
      });
    });

    const context = await searchWeb("who won the match last night");
    expect(context).toContain("Serper Hit");
    expect(context).toContain("From Google.");
    expect(fetchCalls()).toBe(1);
  });

  it("falls back to Exa when DuckDuckGo is empty and Serper errors", async () => {
    duckReturns([]);
    setKey("SERPER_API_KEY", "serper-test-key");
    setKey("EXA_API_KEY", "exa-test-key");
    const fetchCalls = mockFetch((url) => {
      if (url.includes("serper")) return new Response("nope", { status: 500 });
      expect(url).toBe("https://api.exa.ai/search");
      return json({
        results: [{ title: "Exa Hit", text: "Neural result.", url: "https://example.com/exa" }],
      });
    });

    const context = await searchWeb("tell me about neural search");
    expect(context).toContain("Exa Hit");
    expect(context).toContain("Neural result.");
    expect(fetchCalls()).toBe(2);
  });

  it("only reaches the network for a query with a temporal marker", async () => {
    duckReturns([duckResult("Tokyo Weather", "18C and clear.", "https://weather.example")]);

    expect(shouldSearchWeb("What is the weather like in Tokyo right now?", true)).toBe(true);
    expect(shouldSearchWeb("how did you sleep?", true)).toBe(false);

    const context = await searchWeb("What is the weather like in Tokyo right now?");
    expect(context).toContain("18C and clear.");
    expect(duckCalls).toBe(1);
  });

  it("caches per normalised query, so two different questions both hit the network", async () => {
    duckReturns([duckResult("A", "first answer", "https://a.example")]);
    await searchWeb("who won the game");
    await searchWeb("  WHO WON THE GAME  ");
    expect(duckCalls).toBe(1);

    await searchWeb("what is the weather in Tokyo");
    expect(duckCalls).toBe(2);
    expect(getSearchCacheSize()).toBe(2);
  });

  it("ignores a blank query without calling any provider", async () => {
    const fetchCalls = mockFetch(() => json({}));
    expect(await searchWeb("   ")).toBe("");
    expect(duckCalls).toBe(0);
    expect(fetchCalls()).toBe(0);
  });
});
