import { describe, expect, it } from "bun:test";
import { IMAGE } from "@eidolon/config";
import { extractIdeas, fill, isUsable, tidy } from "@/services/photo-ideas";

const NL = String.fromCharCode(10);

describe("reading ideas out of a model's answer", () => {
  it("reads a clean array", () => {
    expect(extractIdeas('["the peaches", "my silly hat"]')).toEqual([
      "the peaches",
      "my silly hat",
    ]);
  });

  it("ignores prose after the array", () => {
    const raw = '["the peaches", "my silly hat"] These take the conversation into account: 1. ...';
    expect(extractIdeas(raw)).toEqual(["the peaches", "my silly hat"]);
  });

  it("gathers every array when the model sends several", () => {
    const raw = '["the peaches"] ["my silly hat"] ["the street outside"]';
    expect(extractIdeas(raw)).toEqual(["the peaches", "my silly hat", "the street outside"]);
  });

  it("repairs an array with the commas missing", () => {
    expect(extractIdeas('["the peaches" "my silly hat"]')).toEqual(["the peaches", "my silly hat"]);
  });

  it("falls back to lines when there is no array at all", () => {
    const raw = ["1. the peaches", "- my silly hat"].join(NL);
    expect(extractIdeas(raw)).toEqual(["the peaches", "my silly hat"]);
  });
});

describe("tidying one idea", () => {
  it("drops the lead-in, the quotes and the full stop", () => {
    expect(tidy('"A photo of the peaches on my lap."')).toBe("the peaches on my lap");
  });

  it("clips an overlong idea on a word boundary", () => {
    const clipped = tidy(`the ${"peaches ".repeat(20)}`);

    expect(clipped.length).toBeLessThanOrEqual(IMAGE.ideaMaxChars);
    expect(clipped.endsWith(" ")).toBe(false);
  });
});

describe("deciding an idea is worth offering", () => {
  it("keeps an ordinary one", () => {
    expect(isUsable("my third coffee", "Emma")).toBe(true);
  });

  it("drops a whole sentence", () => {
    expect(isUsable("The quiet, dimly lit office is still deathly silent tonight", "Emma")).toBe(
      false,
    );
  });

  it("drops one that writes the character's name", () => {
    expect(isUsable("Emma holding up her silly hat", "Emma")).toBe(false);
  });

  it("drops one about the phone rather than the world", () => {
    expect(isUsable("my thumb over the send button", "Emma")).toBe(false);
    expect(isUsable("the photo on my screen", "Emma")).toBe(false);
  });

  it("drops the example the old prompt taught it to parrot", () => {
    expect(isUsable("Me and the dog on the sofa", "Emma")).toBe(false);
    expect(isUsable("The view from the top", "Emma")).toBe(false);
  });
});

describe("filling the tray", () => {
  it("treats a reworded idea as the same idea", () => {
    const chosen = fill([
      "Third coffee, quiet office",
      "Dead quiet, third coffee",
      "The office, dead quiet, third coffee",
      "Third coffee, dead quiet, the office",
    ]);

    expect(chosen).toHaveLength(IMAGE.ideaCount);
    expect(chosen.filter((idea) => idea.toLowerCase().includes("third coffee"))).toHaveLength(1);
  });

  it("always offers the configured count, all different", () => {
    const chosen = fill(["my third coffee"]);

    expect(chosen).toHaveLength(IMAGE.ideaCount);
    expect(new Set(chosen).size).toBe(IMAGE.ideaCount);
    expect(chosen[0]).toBe("my third coffee");
  });

  it("varies what it reaches for, so a reroll changes something", () => {
    const seen = new Set<string>();
    for (let attempt = 0; attempt < 12; attempt += 1) seen.add(fill([]).join("|"));
    expect(seen.size).toBeGreaterThan(1);
  });
});
