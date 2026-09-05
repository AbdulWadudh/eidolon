import { describe, expect, it } from "bun:test";
import { safeJsonParse, stripCodeFences } from "../src/utils/json";

describe("Safe JSON Parser", () => {
  it("parses valid JSON string", () => {
    const raw = '{"name": "Eidolon", "affinity": 100}';
    const parsed = safeJsonParse<{ name: string; affinity: number }>(raw);
    expect(parsed.name).toBe("Eidolon");
    expect(parsed.affinity).toBe(100);
  });

  it("strips markdown code fences", () => {
    const raw = '```json\n{"status": "ok"}\n```';
    expect(stripCodeFences(raw)).toBe('{"status": "ok"}');

    const parsed = safeJsonParse<{ status: string }>(raw);
    expect(parsed.status).toBe("ok");
  });

  it("repairs malformed JSON with unquoted keys and trailing commas", () => {
    // Malformed JSON common from local LLM outputs
    const malformed = "{ name: 'Eidolon', items: [1, 2, 3, ], active: true, }";
    const parsed = safeJsonParse<{ name: string; items: number[]; active: boolean }>(malformed);
    expect(parsed.name).toBe("Eidolon");
    expect(parsed.items).toEqual([1, 2, 3]);
    expect(parsed.active).toBe(true);
  });

  it("repairs malformed JSON wrapped in markdown fences with trailing commas", () => {
    const fencedMalformed = '```\n{ mood: "Pensive", depth: 42, }\n```';
    const parsed = safeJsonParse<{ mood: string; depth: number }>(fencedMalformed);
    expect(parsed.mood).toBe("Pensive");
    expect(parsed.depth).toBe(42);
  });

  it("returns fallback value when input cannot be parsed even after repair", () => {
    const unparseable = "```json\n\n```";
    const fallback = { fallbackUsed: true };
    const parsed = safeJsonParse(unparseable, fallback);
    expect(parsed).toEqual(fallback);
  });

  it("throws error when unparseable input has no fallback", () => {
    const unparseable = "";
    expect(() => safeJsonParse(unparseable)).toThrow();
  });
});
