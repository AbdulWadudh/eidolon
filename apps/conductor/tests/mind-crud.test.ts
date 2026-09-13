import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { buildMindView } from "@/api/mind";
import { appendMessage, ensureCharacter, sqlite } from "@/db";
import {
  appendChronicle,
  deleteChronicle,
  getChronicle,
  getChronicles,
  nextChapterIndex,
  updateChronicle,
} from "@/db/chronicles";
import { deleteLoreEntry, getLoreEntries, upsertLoreEntry } from "@/db/lorebook";

const TEST_USER = "user:mind-crud";

const CHARACTER_ID = "mind-crud-test";

beforeEach(() => {
  sqlite.query("DELETE FROM chronicles WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM lorebook_entries WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
  ensureCharacter(CHARACTER_ID, TEST_USER);
});

describe("Chronicle chapters", () => {
  it("edits a chapter in place without moving its index", () => {
    appendChronicle(CHARACTER_ID, TEST_USER, 1, "first cut");
    const [chapter] = getChronicles(CHARACTER_ID, TEST_USER, 10);
    if (!chapter) throw new Error("expected a chapter");

    expect(updateChronicle(chapter.id, "a truer cut", TEST_USER)).toBe(true);

    const after = getChronicle(chapter.id, TEST_USER);
    expect(after?.summaryText).toBe("a truer cut");
    expect(after?.chapterIndex).toBe(1);
  });

  it("deletes a chapter and leaves the others alone", () => {
    appendChronicle(CHARACTER_ID, TEST_USER, 1, "one");
    appendChronicle(CHARACTER_ID, TEST_USER, 2, "two");
    const chapters = getChronicles(CHARACTER_ID, TEST_USER, 10);
    const second = chapters.find((entry) => entry.chapterIndex === 2);
    if (!second) throw new Error("expected chapter two");

    expect(deleteChronicle(second.id, TEST_USER)).toBe(true);

    const left = getChronicles(CHARACTER_ID, TEST_USER, 10);
    expect(left).toHaveLength(1);
    expect(left[0]?.chapterIndex).toBe(1);
  });

  it("reports a miss rather than pretending it worked", () => {
    expect(updateChronicle("nope", "text", TEST_USER)).toBe(false);
    expect(deleteChronicle("nope", TEST_USER)).toBe(false);
  });

  it("hands the next index out above the highest kept chapter", () => {
    appendChronicle(CHARACTER_ID, TEST_USER, 1, "one");
    appendChronicle(CHARACTER_ID, TEST_USER, 2, "two");
    expect(nextChapterIndex(CHARACTER_ID, TEST_USER)).toBe(3);
  });

  it("surfaces chapters through the mind view newest first", () => {
    appendChronicle(CHARACTER_ID, TEST_USER, 1, "one");
    appendChronicle(CHARACTER_ID, TEST_USER, 2, "two");

    const view = buildMindView(CHARACTER_ID, TEST_USER);
    expect(view.chapters[0]?.chapterIndex).toBe(2);
    expect(view.chapters).toHaveLength(2);
  });
});

describe("Lore entries", () => {
  it("creates, then edits by id rather than duplicating", () => {
    const id = upsertLoreEntry(CHARACTER_ID, { keys: ["lisbon"], content: "the job" });
    upsertLoreEntry(CHARACTER_ID, { keys: ["lisbon", "job"], content: "the offer" }, id);

    const entries = getLoreEntries(CHARACTER_ID);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.content).toBe("the offer");
    expect(entries[0]?.keys).toEqual(["lisbon", "job"]);
  });

  it("keeps the affinity gate and the active flag", () => {
    upsertLoreEntry(CHARACTER_ID, {
      keys: ["secret"],
      content: "held back",
      requiredAffinity: 60,
      isActive: false,
    });

    const [entry] = getLoreEntries(CHARACTER_ID);
    expect(entry?.requiredAffinity).toBe(60);
    expect(entry?.isActive).toBe(false);
  });

  it("deletes an entry", () => {
    const id = upsertLoreEntry(CHARACTER_ID, { keys: ["gone"], content: "bye" });
    deleteLoreEntry(id);
    expect(getLoreEntries(CHARACTER_ID)).toHaveLength(0);
  });
});

describe("Manual summarise", () => {
  it("has a batch to work from once anything has been said", async () => {
    const { batchForMilestone } = await import("@/orchestrator/chronicle");
    expect(batchForMilestone(CHARACTER_ID, TEST_USER)).toHaveLength(0);

    appendMessage(CHARACTER_ID, "user", "hello", TEST_USER);
    appendMessage(CHARACTER_ID, "assistant", "hi", TEST_USER);

    expect(batchForMilestone(CHARACTER_ID, TEST_USER).length).toBeGreaterThan(0);
  });
});

afterAll(() => {
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM chronicles WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM lorebook_entries WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
});
