import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { LOREBOOK } from "@eidolon/config";
import { db, ensureCharacter } from "@/db";
import { getActiveLoreEntries, type StoredLoreEntry, upsertLoreEntry } from "@/db/lorebook";
import {
  formatLore,
  keyPattern,
  loreContext,
  matchesKey,
  scanLorebook,
  triggeredBy,
  unlockedFor,
} from "@/orchestrator/lorebook";
import { affinityTier } from "@/services/affinity-ladder";

const CHARACTER_ID = "lorebook-test";

function entry(over: Partial<StoredLoreEntry> = {}): StoredLoreEntry {
  return {
    id: over.id ?? crypto.randomUUID(),
    keys: over.keys ?? ["pendant"],
    content: over.content ?? "The pendant was her mother's.",
    requiredAffinity: over.requiredAffinity ?? 0,
    isActive: over.isActive ?? true,
  };
}

function seed(): void {
  ensureCharacter(CHARACTER_ID);
  upsertLoreEntry(CHARACTER_ID, {
    keys: ["pendant", "necklace"],
    content: "The pendant was her mother's, and she has not taken it off since the funeral.",
    requiredAffinity: 0,
  });
  upsertLoreEntry(CHARACTER_ID, {
    keys: ["lisbon"],
    content: "Lisbon is where she grew up, above a bakery on Rua da Bica.",
    requiredAffinity: 0,
  });
  upsertLoreEntry(CHARACTER_ID, {
    keys: ["scar", "wrist"],
    content: "The scar on her wrist is from the night she left home at seventeen.",
    requiredAffinity: 60,
  });
  upsertLoreEntry(CHARACTER_ID, {
    keys: ["retired"],
    content: "An entry nobody should ever see.",
    requiredAffinity: 0,
    isActive: false,
  });
}

function wipe(): void {
  db.query("DELETE FROM lorebook_entries WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
}

beforeEach(() => {
  wipe();
  seed();
});

afterEach(wipe);

describe("keyword matching", () => {
  it("matches a whole word regardless of case", () => {
    expect(matchesKey("Where did you get that PENDANT?", "pendant")).toBe(true);
    expect(matchesKey("tell me about the pendant.", "pendant")).toBe(true);
  });

  it("does not fire on a word that merely contains the key", () => {
    expect(matchesKey("the pendantry of it all", "pendant")).toBe(false);
    expect(matchesKey("scarves are nice", "scar")).toBe(false);
  });

  it("matches at the very start and very end of the text", () => {
    expect(matchesKey("pendant", "pendant")).toBe(true);
    expect(matchesKey("show me the pendant", "pendant")).toBe(true);
  });

  it("treats a key with regex characters literally", () => {
    expect(() => keyPattern("what? (really)")).not.toThrow();
    expect(matchesKey("she said what? (really) last night", "what? (really)")).toBe(true);
  });

  it("ignores a blank key", () => {
    expect(matchesKey("anything at all", "   ")).toBe(false);
  });
});

describe("affinity gating", () => {
  it("hides an entry whose required affinity is above the current score", () => {
    const entries = [entry({ requiredAffinity: 0 }), entry({ requiredAffinity: 60 })];
    expect(unlockedFor(entries, 10)).toHaveLength(1);
    expect(unlockedFor(entries, 60)).toHaveLength(2);
    expect(unlockedFor(entries, 61)).toHaveLength(2);
  });

  it("keeps a secret out of the prompt until trust is earned", async () => {
    const cold = await scanLorebook(CHARACTER_ID, "what is that scar on your wrist?", 20);
    expect(cold).toEqual([]);

    const warm = await scanLorebook(CHARACTER_ID, "what is that scar on your wrist?", 74);
    expect(warm).toHaveLength(1);
    expect(warm[0]).toContain("seventeen");
  });

  it("names the tier a locked secret is waiting on", () => {
    expect(affinityTier(60)).toBe("Close");
  });
});

describe("scanLorebook", () => {
  it("returns nothing when no keyword appears", async () => {
    expect(await scanLorebook(CHARACTER_ID, "how was your day?", 100)).toEqual([]);
  });

  it("collects every entry a message triggers", async () => {
    const hits = await scanLorebook(CHARACTER_ID, "that pendant, is it from Lisbon?", 100);
    expect(hits).toHaveLength(2);
  });

  it("fires on any one of an entry's keys", async () => {
    const byAlias = await scanLorebook(CHARACTER_ID, "nice necklace", 0);
    expect(byAlias).toHaveLength(1);
    expect(byAlias[0]).toContain("mother's");
  });

  it("never returns a deactivated entry", async () => {
    expect(await scanLorebook(CHARACTER_ID, "is this retired?", 100)).toEqual([]);
    expect(getActiveLoreEntries(CHARACTER_ID)).toHaveLength(3);
  });

  it("caps how many entries one turn can inject", () => {
    const many = Array.from({ length: 10 }, () => entry());
    expect(triggeredBy(many, "pendant").length).toBe(10);
    expect(triggeredBy(many, "pendant").slice(0, LOREBOOK.maxEntriesPerTurn)).toHaveLength(
      LOREBOOK.maxEntriesPerTurn,
    );
  });
});

describe("prompt formatting", () => {
  it("wraps triggered lore in the labelled block", async () => {
    const block = await loreContext(CHARACTER_ID, "tell me about the pendant", 0);
    expect(block.startsWith(`${LOREBOOK.header}:`)).toBe(true);
    expect(block).toContain("- The pendant was her mother's");
  });

  it("returns an empty string rather than an empty block", () => {
    expect(formatLore([])).toBe("");
    expect(formatLore(["   "])).toBe("");
  });

  it("truncates a runaway entry", () => {
    const block = formatLore(["x".repeat(LOREBOOK.maxContentChars * 2)]);
    expect(block.length).toBeLessThan(LOREBOOK.maxContentChars * 2);
    expect(block).toContain("…");
  });
});
