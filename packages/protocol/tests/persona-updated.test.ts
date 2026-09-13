import { describe, expect, it } from "bun:test";
import { parseServerMessage } from "../src";

describe("a finished portrait is announced rather than waited for", () => {
  it("carries the persona it belongs to and the picture it produced", () => {
    const parsed = parseServerMessage({
      type: "persona_updated",
      payload: {
        persona_id: "38268e63-c869-443d-9336-57ef67155641",
        photo_url: "https://example.com/portrait.webp",
      },
    }) as { payload?: { persona_id?: string; photo_url?: string | null } };

    expect(parsed.payload?.persona_id).toBe("38268e63-c869-443d-9336-57ef67155641");
    expect(parsed.payload?.photo_url).toBe("https://example.com/portrait.webp");
  });

  it("allows a cleared picture", () => {
    expect(() =>
      parseServerMessage({
        type: "persona_updated",
        payload: { persona_id: "a-persona", photo_url: null },
      }),
    ).not.toThrow();
  });

  it("refuses one with no persona to attach to", () => {
    expect(() =>
      parseServerMessage({ type: "persona_updated", payload: { persona_id: "", photo_url: null } }),
    ).toThrow();
  });
});
