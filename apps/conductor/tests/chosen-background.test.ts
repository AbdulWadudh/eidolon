import { afterEach, describe, expect, it } from "bun:test";
import { createCharacter } from "@/db/characters";
import {
  getCharacterLook,
  hasChosenBackground,
  setCharacterBackground,
  setStageBackground,
} from "@/db/look";
import { remember, wipe } from "./support/characters";

afterEach(wipe);

function fresh(name: string): string {
  return remember(createCharacter({ name })).id;
}

describe("a background the reader chose", () => {
  it("is remembered as theirs, not as something a scene set", () => {
    const id = fresh("bg chosen probe");

    expect(hasChosenBackground(id)).toBe(false);
    setCharacterBackground(id, "https://example.com/mine.webp");
    expect(hasChosenBackground(id)).toBe(true);
  });

  it("stops being theirs once they clear it, so scenes may set one again", () => {
    const id = fresh("bg cleared probe");

    setCharacterBackground(id, "https://example.com/mine.webp");
    setCharacterBackground(id, null);

    expect(hasChosenBackground(id)).toBe(false);
    expect(getCharacterLook(id).backgroundUrl).toBeNull();
  });

  it("is not claimed by a scene writing one of its own", () => {
    const id = fresh("bg stage probe");

    setStageBackground(id, "https://example.com/scene.webp");

    expect(hasChosenBackground(id)).toBe(false);
    expect(getCharacterLook(id).backgroundUrl).toBe("https://example.com/scene.webp");
  });

  it("survives a scene writing over the picture itself", () => {
    const id = fresh("bg survives probe");

    setCharacterBackground(id, "https://example.com/mine.webp");
    setStageBackground(id, "https://example.com/scene.webp");

    expect(hasChosenBackground(id)).toBe(true);
  });
});
