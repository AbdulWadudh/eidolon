import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import "./support/mock-native";

const { useConnectionStore } = await import("../store/connection");
const { fetchCharacters, fetchPresets, requestPortrait } = await import("../store/character-api");

describe("Character API credentials", () => {
  const originalFetch = globalThis.fetch;
  let seen: RequestInit | undefined;

  beforeEach(() => {
    seen = undefined;
    useConnectionStore.setState({ sessionToken: "secret-token" });
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      seen = init;
      return new Response(JSON.stringify({ characters: [], presets: [] }), { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    useConnectionStore.setState({ sessionToken: "" });
  });

  const authorization = () => (seen?.headers as Record<string, string> | undefined)?.Authorization;

  it("signs the roster request so the guard does not answer with an empty list", async () => {
    await fetchCharacters("host:3000");
    expect(authorization()).toBe("Bearer secret-token");
  });

  it("signs preset reads", async () => {
    await fetchPresets("host:3000");
    expect(authorization()).toBe("Bearer secret-token");
  });

  it("signs writes without dropping their own headers", async () => {
    await requestPortrait("host:3000", "emma", "in the rain");
    expect(authorization()).toBe("Bearer secret-token");
    const headers = seen?.headers as Record<string, string> | undefined;
    expect(headers?.["Content-Type"]).toBe("application/json");
  });

  it("still sends the request unsigned when nothing is paired yet", async () => {
    useConnectionStore.setState({ sessionToken: "" });
    await fetchCharacters("host:3000");
    expect(authorization()).toBeUndefined();
  });
});
