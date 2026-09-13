import { describe, expect, it } from "bun:test";
import { pronounsFor } from "@eidolon/config";
import { composeAppearance } from "@/services/photo-look";

const LOOK = {
  age: "late twenties",
  face: "sharp",
  eyes: "grey",
  hair: "short dark",
  skin: "pale",
  build: "slim",
};

describe("an image prompt says who it is drawing", () => {
  it("names a woman for she/her", () => {
    expect(composeAppearance(LOOK, "", pronounsFor("she").figure)).toStartWith("a woman");
  });

  it("names a man for he/him", () => {
    expect(composeAppearance(LOOK, "", pronounsFor("he").figure)).toStartWith("a man");
  });

  it("says a person for they/them rather than guessing", () => {
    expect(composeAppearance(LOOK, "", pronounsFor("they").figure)).toStartWith("a person");
  });

  it("falls back to a person when the pronouns are unset or nonsense", () => {
    expect(pronounsFor(null).figure).toBe("a person");
    expect(pronounsFor("banana").figure).toBe("a person");
  });

  it("still carries every fixed feature after the subject", () => {
    const prompt = composeAppearance(LOOK, "", pronounsFor("she").figure);

    for (const part of ["late twenties", "grey eyes", "short dark hair", "pale skin"]) {
      expect(prompt).toContain(part);
    }
  });

  it("says nothing extra when no figure is given", () => {
    expect(composeAppearance(LOOK, "")).not.toContain("a person");
  });
});
