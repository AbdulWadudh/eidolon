import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import {
  appendMessage,
  db,
  deleteMessage,
  ensureCharacter,
  getTranscript,
  lastExchange,
  updateMessageContent,
} from "@/db";

const CHARACTER_ID = "regenerate-test";

beforeEach(() => {
  db.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
  ensureCharacter(CHARACTER_ID);
});

describe("lastExchange", () => {
  it("finds nothing in an empty chat", () => {
    expect(lastExchange(CHARACTER_ID)).toBeNull();
  });

  it("finds nothing when only the player has spoken", () => {
    appendMessage(CHARACTER_ID, "user", "hello");
    expect(lastExchange(CHARACTER_ID)).toBeNull();
  });

  it("pairs the newest reply with the message that prompted it", () => {
    appendMessage(CHARACTER_ID, "user", "first");
    appendMessage(CHARACTER_ID, "assistant", "first reply");
    appendMessage(CHARACTER_ID, "user", "second");
    const newest = appendMessage(CHARACTER_ID, "assistant", "second reply");

    const found = lastExchange(CHARACTER_ID);
    expect(found?.assistantId).toBe(newest);
    expect(found?.userText).toBe("second");
  });

  it("always targets the newest reply, never an older one", () => {
    appendMessage(CHARACTER_ID, "user", "first");
    const older = appendMessage(CHARACTER_ID, "assistant", "first reply");
    appendMessage(CHARACTER_ID, "user", "second");
    appendMessage(CHARACTER_ID, "assistant", "second reply");

    expect(lastExchange(CHARACTER_ID)?.assistantId).not.toBe(older);
  });

  it("moves back a turn once the newest reply is removed", () => {
    appendMessage(CHARACTER_ID, "user", "first");
    appendMessage(CHARACTER_ID, "assistant", "first reply");
    appendMessage(CHARACTER_ID, "user", "second");
    const newest = appendMessage(CHARACTER_ID, "assistant", "second reply");

    deleteMessage(newest);

    const found = lastExchange(CHARACTER_ID);
    expect(found?.userText).toBe("first");
    expect(getTranscript(CHARACTER_ID, 10)).toHaveLength(3);
  });
});

describe("Editing a message", () => {
  it("rewrites the content in place", () => {
    const id = appendMessage(CHARACTER_ID, "assistant", "first draft");
    expect(updateMessageContent(id, "a better line")).toBe(true);

    const transcript = getTranscript(CHARACTER_ID, 10);
    expect(transcript[0]?.content).toBe("a better line");
    expect(transcript).toHaveLength(1);
  });

  it("reports a miss on an unknown id", () => {
    expect(updateMessageContent("nope", "text")).toBe(false);
  });

  it("leaves the edit in the history the model reads back", () => {
    appendMessage(CHARACTER_ID, "user", "hello");
    const id = appendMessage(CHARACTER_ID, "assistant", "wrong");
    updateMessageContent(id, "right");

    expect(lastExchange(CHARACTER_ID)?.assistantId).toBe(id);
    expect(getTranscript(CHARACTER_ID, 10).at(-1)?.content).toBe("right");
  });
});

afterAll(() => {
  db.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
});
