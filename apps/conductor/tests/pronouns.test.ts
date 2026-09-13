import { beforeEach, describe, expect, it } from "bun:test";
import { DEFAULT_PRONOUNS, isPronounKey, PRONOUN_SETS, pronounsFor } from "@eidolon/config";
import { db, getCharacterCard } from "@/db";
import { createCharacter, deleteCharacter, getCharacter, updateCharacter } from "@/db/characters";
import { loadPrompts } from "@/prompts/store";
import { buildSystemPrompt } from "@/services/persona";

const NAME = "Pronoun Probe";

beforeEach(async () => {
  await loadPrompts();
  db.query("DELETE FROM characters WHERE name = ?").run(NAME);
});

describe("Pronoun vocabulary", () => {
  it("resolves every known set, case-insensitively", () => {
    expect(pronounsFor("she").subject).toBe("she");
    expect(pronounsFor("HE").object).toBe("him");
    expect(pronounsFor(" they ").possessive).toBe("their");
  });

  it("falls back to they/them for anything unknown", () => {
    expect(pronounsFor("xyz")).toEqual(PRONOUN_SETS[DEFAULT_PRONOUNS]);
    expect(pronounsFor(null)).toEqual(PRONOUN_SETS.they);
    expect(pronounsFor(undefined).subject).toBe("they");
    expect(pronounsFor("")).toEqual(PRONOUN_SETS.they);
  });

  it("guards membership", () => {
    expect(isPronounKey("she")).toBe(true);
    expect(isPronounKey("She")).toBe(true);
    expect(isPronounKey("zie")).toBe(false);
    expect(isPronounKey(undefined)).toBe(false);
  });
});

describe("Pronouns on the character", () => {
  it("stores what was chosen and reads it back", () => {
    const card = createCharacter({ name: NAME, pronouns: "he" });
    expect(card.pronouns).toBe("he");
    expect(getCharacter(card.id)?.pronouns).toBe("he");
    deleteCharacter(card.id);
  });

  it("defaults to they/them when the card says nothing", () => {
    const card = createCharacter({ name: NAME });
    expect(card.pronouns).toBe(DEFAULT_PRONOUNS);
    deleteCharacter(card.id);
  });

  it("refuses to store a pronoun outside the vocabulary", () => {
    const card = createCharacter({ name: NAME, pronouns: "she" });
    updateCharacter(card.id, { pronouns: "made-up" });
    expect(getCharacter(card.id)?.pronouns).toBe("she");
    deleteCharacter(card.id);
  });

  it("carries through to the prompt the model reads", () => {
    const card = createCharacter({ name: NAME, pronouns: "he" });
    const stored = getCharacterCard(card.id);
    expect(stored.pronouns).toBe("he");

    const prompt = buildSystemPrompt(stored);
    expect(prompt).toContain("he/him/his");
    expect(prompt).not.toContain("she/her/her");

    deleteCharacter(card.id);
  });

  it("tells the model they/them for a character created before the field existed", () => {
    const card = createCharacter({ name: NAME });
    db.query("UPDATE characters SET pronouns = NULL WHERE id = ?").run(card.id);

    const prompt = buildSystemPrompt(getCharacterCard(card.id));
    expect(prompt).toContain("they/them/their");

    deleteCharacter(card.id);
  });
});
