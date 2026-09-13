import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  CHAT_TURN,
  LLM_PROFILES,
  MIND_UPDATE,
  PROMPT_BUDGET,
  WORKING_CONTEXT,
} from "@eidolon/config";
import { appendMessage, db, ensureCharacter } from "@/db";
import { assemblePrompt, clip, fitHistory } from "@/orchestrator/prompt-builder";
import { loadPrompts } from "@/prompts/store";
import { PROFILE } from "@/services/llm-profile";

const TEST_USER = "user:context-bound";

const CHARACTER_ID = "context-bound-test";

function wipe(): void {
  db.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
}

beforeEach(async () => {
  await loadPrompts();
  wipe();
  ensureCharacter(CHARACTER_ID, TEST_USER);
});

afterEach(wipe);

describe("the prompt cannot overrun the context", () => {
  for (const [name, profile] of Object.entries(LLM_PROFILES)) {
    it(`fits ${name}'s character budget into its context at the worst tokenisation`, () => {
      const worstTokens = Math.ceil(profile.promptMaxChars / PROMPT_BUDGET.worstCharsPerToken);
      const reserve = CHAT_TURN.maxTokens + MIND_UPDATE.extraTokens;

      expect(worstTokens + reserve).toBeLessThanOrEqual(profile.contextTokens);
    });

    it(`leaves ${name} room to finish the reply`, () => {
      expect(profile.contextTokens).toBeGreaterThan(profile.promptMaxChars / 4);
      expect(profile.historyMaxChars).toBeLessThanOrEqual(profile.promptMaxChars);
    });
  }

  it("leaves the reply room to finish", () => {
    expect(CHAT_TURN.maxTokens + MIND_UPDATE.extraTokens).toBeGreaterThan(0);
  });
});

describe("bounding a pasted wall of text", () => {
  it("stops taking history once the budget is spent", () => {
    const messages = Array.from({ length: 20 }, () => ({
      role: "user",
      content: "p".repeat(1000),
    }));

    const kept = fitHistory(messages, 3000);
    expect(kept.length).toBeLessThanOrEqual(3);
    expect(kept.reduce((sum, m) => sum + m.content.length, 0)).toBeLessThanOrEqual(3000);
  });

  it("keeps the newest turns, not the oldest", () => {
    const messages = [
      { role: "user", content: "oldest" },
      { role: "assistant", content: "middle" },
      { role: "user", content: "newest" },
    ];

    expect(fitHistory(messages, 12).map((m) => m.content)).toEqual(["middle", "newest"]);
  });

  it("clips one enormous message rather than letting it eat the budget", () => {
    expect(clip("x".repeat(5000), 100)).toHaveLength(101);
    expect(clip("short", 100)).toBe("short");
  });

  it("never lets a single message spend the whole window", () => {
    const kept = fitHistory([{ role: "user", content: "z".repeat(100_000) }], 6000);
    for (const message of kept) {
      expect(message.content.length).toBeLessThanOrEqual(WORKING_CONTEXT.maxMessageChars + 1);
    }
  });

  it("keeps a real assembled prompt inside the character budget however long the paste", async () => {
    for (let index = 0; index < PROFILE.historyTurns; index += 1) {
      appendMessage(
        CHARACTER_ID,
        index % 2 === 0 ? "user" : "assistant",
        "p".repeat(20_000),
        TEST_USER,
      );
    }

    const assembled = await assemblePrompt({
      characterId: CHARACTER_ID,
      userId: TEST_USER,
      userText: "q".repeat(20_000),
      allowSearch: false,
    });

    const total = assembled.messages.reduce((sum, m) => sum + m.content.length, 0);
    expect(total).toBeLessThanOrEqual(PROFILE.promptMaxChars);
  });
});
