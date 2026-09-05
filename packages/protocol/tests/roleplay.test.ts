import { describe, expect, it } from "bun:test";
import { hasInfluence, splitInfluence, stripInfluence } from "../src/roleplay";

describe("influence markup", () => {
  it("pulls a directive out and leaves the spoken words", () => {
    expect(splitInfluence("<be shy> so what's up?")).toEqual({
      spoken: "so what's up?",
      influences: ["be shy"],
    });
  });

  it("handles a directive in the middle of a sentence", () => {
    expect(splitInfluence("hey <get nervous> you good?")).toEqual({
      spoken: "hey you good?",
      influences: ["get nervous"],
    });
  });

  it("collects several directives in one message", () => {
    const { spoken, influences } = splitInfluence("<be shy> hi <and blush> there");
    expect(influences).toEqual(["be shy", "and blush"]);
    expect(spoken).toBe("hi there");
  });

  it("leaves a message with no directive untouched", () => {
    expect(splitInfluence("just a normal message")).toEqual({
      spoken: "just a normal message",
      influences: [],
    });
  });

  it("does not confuse an action or a parenthetical for a directive", () => {
    const { spoken, influences } = splitInfluence("*waves* hello (quietly)");
    expect(influences).toEqual([]);
    expect(spoken).toBe("*waves* hello (quietly)");
  });

  it("ignores a comparison, which is why the brackets take no padding space", () => {
    for (const line of ["5 < 10 and 20 > 15", "a < b and c > d", "x <  y  > z"]) {
      expect(splitInfluence(line).influences).toEqual([]);
      expect(splitInfluence(line).spoken).toBe(line.replace(/\s+/g, " ").trim());
    }
  });

  it("ignores an empty or letterless directive", () => {
    for (const line of ["hi <> there", "hi <   > there", "<3", "<--", "<123>"]) {
      expect(splitInfluence(line).influences).toEqual([]);
    }
  });

  it("accepts a single character direction", () => {
    expect(splitInfluence("<x>").influences).toEqual(["x"]);
  });

  it("is repeatable, so a shared regex cannot go stale", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(hasInfluence("hi <be shy>")).toBe(true);
      expect(hasInfluence("hi there")).toBe(false);
    }
  });

  it("strips directives for anything that only needs the words", () => {
    expect(stripInfluence("<be shy> hello")).toBe("hello");
  });
});
