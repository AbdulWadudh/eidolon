import { describe, expect, it } from "bun:test";
import { CHAT_TURN } from "@eidolon/config";
import { countSentences, hasSaidEnough } from "@/services/reply-length";

describe("counting what was actually said", () => {
  it("counts spoken sentences", () => {
    expect(countSentences("One. Two. Three.")).toBe(3);
    expect(countSentences("Hi! Ok? Sure.")).toBe(3);
  });

  it("ignores a full stop inside an action", () => {
    expect(countSentences("*sighs. shrugs.* Hello.")).toBe(1);
  });

  it("does not count an unfinished sentence", () => {
    expect(countSentences("Half a thought without an end")).toBe(0);
  });
});

describe("knowing when to stop", () => {
  it("keeps going below the budget", () => {
    expect(hasSaidEnough("*smiles* I am glad you reached out.")).toBe(false);
    expect(hasSaidEnough("One. Two.")).toBe(false);
  });

  it("stops once the budget is reached", () => {
    expect(hasSaidEnough("One. Two. Three.")).toBe(true);
  });

  it("never stops mid-sentence", () => {
    expect(hasSaidEnough("One. Two. Three and then")).toBe(false);
  });

  it("never stops inside an action, so the asterisks always close", () => {
    expect(hasSaidEnough("One. Two. Three. *reaches out.")).toBe(false);
  });

  it("tolerates a closing quote or bracket after the full stop", () => {
    expect(hasSaidEnough('One. Two. "Three."')).toBe(true);
  });

  it("treats an empty reply as unfinished", () => {
    expect(hasSaidEnough("")).toBe(false);
    expect(hasSaidEnough("   ")).toBe(false);
  });

  it("stops a single sentence that simply ran long", () => {
    const long = `${"a lot of words ".repeat(CHAT_TURN.maxReplyChars / 10)}.`;
    expect(long.length).toBeGreaterThan(CHAT_TURN.maxReplyChars);
    expect(hasSaidEnough(long)).toBe(true);
  });

  it("uses the configured budget rather than a hardcoded number", () => {
    const exactly = Array.from({ length: CHAT_TURN.maxReplySentences }, (_, i) => `S${i}.`).join(
      " ",
    );
    const oneShort = Array.from(
      { length: CHAT_TURN.maxReplySentences - 1 },
      (_, i) => `S${i}.`,
    ).join(" ");

    expect(hasSaidEnough(exactly)).toBe(true);
    expect(hasSaidEnough(oneShort)).toBe(false);
  });
});
