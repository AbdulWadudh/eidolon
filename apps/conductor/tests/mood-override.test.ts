import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { AFFINITY } from "@eidolon/config";
import { applyAffinityOverride } from "@/api/mind";
import { ensureCharacter, getCharacterMind, saveCharacterMind, sqlite } from "@/db";
import { assemblePrompt, resolveMood } from "@/orchestrator/prompt-builder";
import { loadPrompts } from "@/prompts/store";

const TEST_USER = "user:mood-override";

const CHARACTER_ID = "mood-override-test";

beforeEach(async () => {
  await loadPrompts();
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
  ensureCharacter(CHARACTER_ID, TEST_USER);
  saveCharacterMind(CHARACTER_ID, TEST_USER, { score: 40, tier: "Warm", mood: "Curious" });
});

describe("resolveMood", () => {
  it("accepts a known mood regardless of casing", () => {
    expect(resolveMood("playful")).toBe("Playful");
    expect(resolveMood("  TEASING  ")).toBe("Teasing");
  });

  it("rejects anything not in the vocabulary", () => {
    expect(resolveMood("feral")).toBeNull();
    expect(resolveMood("")).toBeNull();
    expect(resolveMood(undefined)).toBeNull();
  });

  it("covers every mood the app offers", () => {
    for (const mood of AFFINITY.moods) {
      expect(resolveMood(mood)).toBe(mood);
    }
  });
});

describe("Persistent mood override", () => {
  it("writes the mood and leaves affinity untouched", () => {
    const view = applyAffinityOverride(CHARACTER_ID, TEST_USER, { mood: "Annoyed" });

    expect(view.character.mood).toBe("Annoyed");
    expect(view.character.affinity).toBe(40);
    expect(getCharacterMind(CHARACTER_ID, TEST_USER).mood).toBe("Annoyed");
  });

  it("ignores a mood outside the vocabulary rather than storing junk", () => {
    applyAffinityOverride(CHARACTER_ID, TEST_USER, { mood: "obliterated" });
    expect(getCharacterMind(CHARACTER_ID, TEST_USER).mood).toBe("Curious");
  });

  it("still applies a score on its own", () => {
    const view = applyAffinityOverride(CHARACTER_ID, TEST_USER, { score: 70 });
    expect(view.character.affinity).toBe(70);
    expect(getCharacterMind(CHARACTER_ID, TEST_USER).mood).toBe("Curious");
  });
});

describe("One-turn mood override", () => {
  it("colours the prompt without touching what is stored", async () => {
    const assembled = await assemblePrompt({
      characterId: CHARACTER_ID,
      userId: TEST_USER,
      userText: "hello",
      allowSearch: false,
      moodOverride: "Vulnerable",
    });

    expect(assembled.sections.state).toContain('Current Mood="Vulnerable"');
    expect(getCharacterMind(CHARACTER_ID, TEST_USER).mood).toBe("Curious");
  });

  it("falls back to the stored mood when the override is unknown or absent", async () => {
    const bogus = await assemblePrompt({
      characterId: CHARACTER_ID,
      userId: TEST_USER,
      userText: "hello",
      allowSearch: false,
      moodOverride: "incandescent",
    });
    expect(bogus.sections.state).toContain('Current Mood="Curious"');

    const none = await assemblePrompt({
      characterId: CHARACTER_ID,
      userId: TEST_USER,
      userText: "hello",
      allowSearch: false,
    });
    expect(none.sections.state).toContain('Current Mood="Curious"');
  });
});

afterAll(() => {
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
});
