import { describe, expect, it } from "bun:test";
import { defaultPrompt, PROMPT_DEFAULTS, PROMPT_KEYS, render } from "../src/prompts";

describe("prompt catalogue", () => {
  it("has a unique key for every prompt", () => {
    expect(new Set(PROMPT_KEYS).size).toBe(PROMPT_KEYS.length);
  });

  it("describes every prompt so an editor knows what it does", () => {
    for (const entry of PROMPT_DEFAULTS) {
      expect(entry.description.length).toBeGreaterThan(10);
      expect(entry.value.trim().length).toBeGreaterThan(0);
    }
  });

  it("declares every variable its template actually uses", () => {
    for (const entry of PROMPT_DEFAULTS) {
      const used = [...entry.value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
      for (const name of used) {
        expect(entry.variables).toContain(name);
      }
    }
  });

  it("returns an empty string for a key that does not exist", () => {
    expect(defaultPrompt("nope.missing")).toBe("");
  });
});

describe("rendering a template", () => {
  it("substitutes every declared variable", () => {
    expect(render("Hi {{name}}, you are {{mood}}.", { name: "Emma", mood: "warm" })).toBe(
      "Hi Emma, you are warm.",
    );
  });

  it("accepts numbers", () => {
    expect(render("{{score}} of {{max}}", { score: 30, max: 100 })).toBe("30 of 100");
  });

  it("leaves an unknown placeholder alone rather than printing undefined", () => {
    expect(render("Hi {{name}}, {{unknown}}", { name: "Emma" })).toBe("Hi Emma, {{unknown}}");
  });

  it("collapses the blank lines an empty variable leaves behind", () => {
    const out = render("Line one.\n{{extra}}\nLine two.", { extra: "" });
    expect(out).toBe("Line one.\n\nLine two.");
    expect(out).not.toMatch(/\n{3,}/);
  });

  it("trims trailing whitespace and outer padding", () => {
    expect(render("  {{a}}   \n\n\n  ", { a: "x" })).toBe("x");
  });

  it("renders the real persona prompt without leaving placeholders", () => {
    const out = render(defaultPrompt("persona.system"), {
      name: "Emma",
      personality: "Warm.",
      extra: "",
      mood: "curious",
      tier: "Friendly",
    });
    expect(out).not.toMatch(/\{\{\w+\}\}/);
    expect(out).toContain("You are Emma.");
  });
});
