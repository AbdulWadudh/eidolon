import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { REASONING } from "@/config";
import { appendMessage, ensureCharacter, getTranscript, sqlite } from "@/db";
import { removeOverride, writeOverride } from "@/db/overrides";
import { loadConfigOverlay } from "@/services/config";

const TEST_USER = "user:reasoning";
const CHARACTER_ID = "reasoning-kept";
const PATH = "REASONING.showToUser";

function scrub(): void {
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
  removeOverride(PATH);
  loadConfigOverlay();
}

beforeEach(() => {
  scrub();
  ensureCharacter(CHARACTER_ID, TEST_USER);
});

afterEach(scrub);

describe("what a character thought is stored beside what she said", () => {
  it("keeps the trace on the message that carried it", () => {
    appendMessage(CHARACTER_ID, "assistant", "Long day. You?", TEST_USER, "she sounds tired");

    const stored = getTranscript(CHARACTER_ID, TEST_USER, 10);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.content).toBe("Long day. You?");
    expect(stored[0]?.reasoning).toBe("she sounds tired");
  });

  it("leaves it null when the reply came without one", () => {
    appendMessage(CHARACTER_ID, "assistant", "Morning.", TEST_USER);
    expect(getTranscript(CHARACTER_ID, TEST_USER, 10)[0]?.reasoning).toBeNull();
  });

  it("stores an empty trace as nothing rather than an empty string", () => {
    appendMessage(CHARACTER_ID, "assistant", "Morning.", TEST_USER, "");
    expect(getTranscript(CHARACTER_ID, TEST_USER, 10)[0]?.reasoning).toBeNull();
  });
});

describe("the admin switch behind it", () => {
  it("ships off, so nothing is kept until someone asks for it", () => {
    expect(REASONING.showToUser as boolean).toBe(false);
  });

  it("takes effect on a live read without restarting the process", () => {
    writeOverride(PATH, true);
    loadConfigOverlay();
    expect(REASONING.showToUser as boolean).toBe(true);

    removeOverride(PATH);
    loadConfigOverlay();
    expect(REASONING.showToUser as boolean).toBe(false);
  });
});
