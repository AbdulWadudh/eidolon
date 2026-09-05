import { describe, expect, it } from "bun:test";
import { SUGGESTIONS } from "@eidolon/config";
import {
  extractCandidates,
  fallbackSuggestions,
  firstLine,
  formatScene,
  generateReplySuggestions,
  hasStageDirection,
  normalizeSuggestions,
  shapeSuggestion,
  splitSentences,
} from "@/services/suggestions";

describe("suggestion shaping", () => {
  it("keeps a one sentence option untouched", () => {
    const raw = "*leans in* Say that again.";
    expect(shapeSuggestion(raw)).toBe(raw);
  });

  it("drops everything past the sentence budget", () => {
    const shaped = shapeSuggestion("*sighs* One. Two. Three. Four.");
    expect(splitSentences(shaped)).toHaveLength(SUGGESTIONS.maxSentences);
    expect(shaped).toBe("*sighs* One. Two.");
  });

  it("collapses newlines and strips wrapping quotes", () => {
    expect(shapeSuggestion('  "*nods*\n  Fine.  " ')).toBe("*nods* Fine.");
  });

  it("clips an overlong single sentence on a word boundary", () => {
    const long = `*paces* ${"word ".repeat(60)}`;
    const shaped = shapeSuggestion(long);

    expect(shaped.length).toBeLessThanOrEqual(SUGGESTIONS.maxChars + 1);
    expect(shaped.endsWith("…")).toBe(true);
    expect(shaped).not.toMatch(/\s…$/);
  });

  it("recognises an asterisk stage direction", () => {
    expect(hasStageDirection("*grins* Sure.")).toBe(true);
    expect(hasStageDirection("Sure.")).toBe(false);
    expect(hasStageDirection("**")).toBe(false);
  });
});

describe("suggestion normalisation", () => {
  it("returns exactly the configured count", () => {
    expect(normalizeSuggestions(["*a* One."])).toHaveLength(SUGGESTIONS.count);
    expect(normalizeSuggestions([])).toHaveLength(SUGGESTIONS.count);
    expect(normalizeSuggestions("not an array")).toHaveLength(SUGGESTIONS.count);
  });

  it("keeps plain options as well as ones with an action", () => {
    const result = normalizeSuggestions(["Tell me more about that.", "*shrugs* If you say so."]);

    expect(result).toContain("*shrugs* If you say so.");
    expect(result).toContain("Tell me more about that.");
    expect(result).toHaveLength(SUGGESTIONS.count);
  });

  it("keeps every option inside the sentence and length budget", () => {
    for (const option of normalizeSuggestions(["*waits* A. B. C. D. E."])) {
      expect(splitSentences(option).length).toBeLessThanOrEqual(SUGGESTIONS.maxSentences);
      expect(option.length).toBeLessThanOrEqual(SUGGESTIONS.maxChars + 1);
    }
  });

  it("does not repeat an option", () => {
    const result = normalizeSuggestions(["*nods* Yes.", "*nods* Yes.", "*nods* Yes."]);
    expect(new Set(result).size).toBe(SUGGESTIONS.count);
  });

  it("ignores non-string entries", () => {
    const result = normalizeSuggestions([42, null, "*waves* Hey.", { text: "no" }]);
    expect(result).toContain("*waves* Hey.");
    expect(result).toHaveLength(SUGGESTIONS.count);
  });
});

describe("fallback suggestions", () => {
  it("always yields the configured count with stage directions", () => {
    const result = fallbackSuggestions();
    expect(result).toHaveLength(SUGGESTIONS.count);
    expect(result.every(hasStageDirection)).toBe(true);
    expect(new Set(result).size).toBe(SUGGESTIONS.count);
  });

  it("varies between calls so a reroll changes something", () => {
    const seen = new Set<string>();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      seen.add(fallbackSuggestions().join("|"));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("generation against an offline model", () => {
  it("falls back rather than letting prose be repaired into options", async () => {
    const result = await generateReplySuggestions([{ role: "user", content: "Long day." }], {
      characterName: "Emma",
      tier: "Friendly",
    });

    expect(result).toHaveLength(SUGGESTIONS.count);
    expect(result.some((option) => option.includes("local brain is offline"))).toBe(false);
  });
});

describe("candidate extraction", () => {
  const NL = String.fromCharCode(10);

  it("reads a proper JSON array", () => {
    expect(extractCandidates('["*nods* One.", "*waits* Two."]')).toEqual([
      "*nods* One.",
      "*waits* Two.",
    ]);
  });

  it("recovers unquoted newline-separated lines inside brackets", () => {
    const raw = [
      "[",
      "  *nods* Sounds nice. I have been cooped up all week.",
      "  *raises an eyebrow* Hiking? What kind of trails?",
      "  *chuckles* I am jealous, my day was meetings.",
      "]",
    ].join(NL);

    const result = extractCandidates(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("*nods* Sounds nice. I have been cooped up all week.");
    expect(result.every((entry) => !entry.startsWith(","))).toBe(true);
  });

  it("strips numbered and dashed list markers but keeps the opening asterisk", () => {
    const raw = ["[", "1. *nods* One.", "- *waits* Two.", "]"].join(NL);
    expect(extractCandidates(raw)).toEqual(["*nods* One.", "*waits* Two."]);
  });

  it("refuses a single line so one stray sentence cannot become options", () => {
    expect(extractCandidates("*looks up softly* My local brain is offline.")).toEqual([]);
  });

  it("keeps plain lines that carry no action", () => {
    expect(extractCandidates(["[", "Tell me more.", "And then?", "]"].join(NL))).toEqual([
      "Tell me more.",
      "And then?",
    ]);
  });
});

describe("single-line option parsing", () => {
  const NL = String.fromCharCode(10);

  it("keeps a line that already opens with an action", () => {
    expect(firstLine("*grins* Sure thing.")).toBe("*grins* Sure thing.");
  });

  it("leaves a plain line alone instead of forcing an action onto it", () => {
    expect(firstLine("Go on then.")).toBe("Go on then.");
  });

  it("takes only the first line and drops a speaker prefix", () => {
    const raw = ["PLAYER: *waves* Hey there.", "EMMA: *smiles* Hello.", ""].join(NL);
    expect(firstLine(raw)).toBe("*waves* Hey there.");
  });

  it("labels the scene with whichever character is on stage", () => {
    const turns = [
      { role: "user", content: "Long day." },
      { role: "assistant", content: "*smiles* Tell me." },
    ];

    expect(formatScene(turns, "Emma")).toBe(
      ["PLAYER: Long day.", "EMMA: *smiles* Tell me."].join(NL),
    );
    expect(formatScene(turns, "Rowan")).toBe(
      ["PLAYER: Long day.", "ROWAN: *smiles* Tell me."].join(NL),
    );
  });
});
