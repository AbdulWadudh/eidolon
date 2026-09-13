import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import {
  appendMessage,
  deleteMessage,
  ensureCharacter,
  getTranscript,
  lastExchange,
  sqlite,
  updateMessageContent,
} from "@/db";

const TEST_USER = "user:regenerate";

const CHARACTER_ID = "regenerate-test";

beforeEach(() => {
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
  ensureCharacter(CHARACTER_ID, TEST_USER);
});

describe("lastExchange", () => {
  it("finds nothing in an empty chat", () => {
    expect(lastExchange(CHARACTER_ID, TEST_USER)).toBeNull();
  });

  it("finds nothing when only the player has spoken", () => {
    appendMessage(CHARACTER_ID, "user", "hello", TEST_USER);
    expect(lastExchange(CHARACTER_ID, TEST_USER)).toBeNull();
  });

  it("pairs the newest reply with the message that prompted it", () => {
    appendMessage(CHARACTER_ID, "user", "first", TEST_USER);
    appendMessage(CHARACTER_ID, "assistant", "first reply", TEST_USER);
    appendMessage(CHARACTER_ID, "user", "second", TEST_USER);
    const newest = appendMessage(CHARACTER_ID, "assistant", "second reply", TEST_USER);

    const found = lastExchange(CHARACTER_ID, TEST_USER);
    expect(found?.assistantId).toBe(newest);
    expect(found?.userText).toBe("second");
  });

  it("always targets the newest reply, never an older one", () => {
    appendMessage(CHARACTER_ID, "user", "first", TEST_USER);
    const older = appendMessage(CHARACTER_ID, "assistant", "first reply", TEST_USER);
    appendMessage(CHARACTER_ID, "user", "second", TEST_USER);
    appendMessage(CHARACTER_ID, "assistant", "second reply", TEST_USER);

    expect(lastExchange(CHARACTER_ID, TEST_USER)?.assistantId).not.toBe(older);
  });

  it("moves back a turn once the newest reply is removed", () => {
    appendMessage(CHARACTER_ID, "user", "first", TEST_USER);
    appendMessage(CHARACTER_ID, "assistant", "first reply", TEST_USER);
    appendMessage(CHARACTER_ID, "user", "second", TEST_USER);
    const newest = appendMessage(CHARACTER_ID, "assistant", "second reply", TEST_USER);

    deleteMessage(newest, TEST_USER);

    const found = lastExchange(CHARACTER_ID, TEST_USER);
    expect(found?.userText).toBe("first");
    expect(getTranscript(CHARACTER_ID, TEST_USER, 10)).toHaveLength(3);
  });
});

describe("Editing a message", () => {
  it("rewrites the content in place", () => {
    const id = appendMessage(CHARACTER_ID, "assistant", "first draft", TEST_USER);
    expect(updateMessageContent(id, "a better line", TEST_USER)).toBe(true);

    const transcript = getTranscript(CHARACTER_ID, TEST_USER, 10);
    expect(transcript[0]?.content).toBe("a better line");
    expect(transcript).toHaveLength(1);
  });

  it("reports a miss on an unknown id", () => {
    expect(updateMessageContent("nope", "text", TEST_USER)).toBe(false);
  });

  it("leaves the edit in the history the model reads back", () => {
    appendMessage(CHARACTER_ID, "user", "hello", TEST_USER);
    const id = appendMessage(CHARACTER_ID, "assistant", "wrong", TEST_USER);
    updateMessageContent(id, "right", TEST_USER);

    expect(lastExchange(CHARACTER_ID, TEST_USER)?.assistantId).toBe(id);
    expect(getTranscript(CHARACTER_ID, TEST_USER, 10).at(-1)?.content).toBe("right");
  });
});

afterAll(() => {
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
});
