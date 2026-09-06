import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  CHRONICLE_CONTEXT,
  LOREBOOK,
  PROMPT_BUDGET,
  RECALL,
  WEB_CONTEXT,
  WORKING_CONTEXT,
} from "@eidolon/config";
import { appendMessage, db, ensureCharacter, saveCharacterMind } from "@/db";
import { appendChronicle } from "@/db/chronicles";
import { upsertLoreEntry } from "@/db/lorebook";
import {
  assemblePrompt,
  estimateTokens,
  orderedSections,
  stateDirective,
  trimToBudget,
  withinBudget,
  workingHistory,
} from "@/orchestrator/prompt-builder";
import { hasTemporalMarker, shouldSearchWeb } from "@/orchestrator/search-trigger";
import { loadPrompts } from "@/prompts/store";

const CHARACTER_ID = "prompt-builder-test";
const NEWLINE = String.fromCharCode(10);

function wipe(): void {
  db.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM chronicles WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM lorebook_entries WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
}

beforeEach(async () => {
  await loadPrompts();
  wipe();
  ensureCharacter(CHARACTER_ID);
  saveCharacterMind(CHARACTER_ID, { score: 74, tier: "Trusted Confidant", mood: "Playful" });
  appendChronicle(CHARACTER_ID, 1, `- She took the Lisbon job.${NEWLINE}- He heard it first.`);
  upsertLoreEntry(CHARACTER_ID, {
    keys: ["pendant"],
    content: "The pendant was her mother's.",
    requiredAffinity: 0,
  });
});

afterEach(wipe);

describe("assembly order", () => {
  it("lays the sections down in the order the spec names", async () => {
    const assembled = await assemblePrompt({
      characterId: CHARACTER_ID,
      userText: "tell me about the pendant",
      allowSearch: false,
    });

    const system = assembled.messages[0]?.content ?? "";
    const stateAt = system.indexOf("[Character State:");
    const chronicleAt = system.indexOf(CHRONICLE_CONTEXT.header);
    const loreAt = system.indexOf(LOREBOOK.header);

    expect(stateAt).toBeGreaterThan(-1);
    expect(chronicleAt).toBeGreaterThan(stateAt);
    expect(loreAt).toBeGreaterThan(chronicleAt);
  });

  it("keeps recall ahead of lore, and lore ahead of web", () => {
    const ordered = orderedSections({
      persona: "P",
      state: "S",
      chronicle: "C",
      recall: RECALL.header,
      lore: LOREBOOK.header,
      web: WEB_CONTEXT.header,
      directive: "D",
    });

    expect(ordered).toEqual([
      "P",
      "S",
      "C",
      RECALL.header,
      LOREBOOK.header,
      WEB_CONTEXT.header,
      "D",
    ]);
  });

  it("drops an empty section instead of leaving a hole", () => {
    expect(orderedSections({ persona: "P", state: "", chronicle: "   ", directive: "D" })).toEqual([
      "P",
      "D",
    ]);
  });
});

describe("injected context", () => {
  it("writes the emotional state directive from stored affinity", () => {
    expect(stateDirective(74, "Trusted Confidant", "Playful")).toBe(
      '[Character State: Affinity=74/100, Tier="Trusted Confidant", Current Mood="Playful"]',
    );
  });

  it("injects the chronicle recap", async () => {
    const assembled = await assemblePrompt({
      characterId: CHARACTER_ID,
      userText: "hey",
      allowSearch: false,
    });
    expect(assembled.sections.chronicle).toContain("Lisbon job");
  });

  it("injects lore only when a keyword fires", async () => {
    const hit = await assemblePrompt({
      characterId: CHARACTER_ID,
      userText: "where did the pendant come from?",
      allowSearch: false,
    });
    const miss = await assemblePrompt({
      characterId: CHARACTER_ID,
      userText: "how was your day?",
      allowSearch: false,
    });

    expect(hit.sections.lore).toContain("mother's");
    expect(miss.sections.lore).toBe("");
  });

  it("ends with the hidden state block directive", async () => {
    const assembled = await assemblePrompt({
      characterId: CHARACTER_ID,
      userText: "hey",
      allowSearch: false,
    });
    const system = assembled.messages[0]?.content ?? "";
    expect(assembled.sections.directive).toContain("[mind_update:");
    expect(system.trimEnd().endsWith(assembled.sections.directive)).toBe(true);
  });
});

describe("working context window", () => {
  it("carries at most the last 20 messages verbatim", () => {
    for (let index = 0; index < 40; index += 1) {
      appendMessage(CHARACTER_ID, index % 2 === 0 ? "user" : "assistant", `line ${index}`);
    }

    const history = workingHistory(CHARACTER_ID);
    expect(history.length).toBeLessThanOrEqual(WORKING_CONTEXT.windowSize);
    expect(history.at(-1)?.content).toBe("line 39");
  });

  it("puts the user turn last, after the history", async () => {
    appendMessage(CHARACTER_ID, "user", "older line");
    const assembled = await assemblePrompt({
      characterId: CHARACTER_ID,
      userText: "the newest thing",
      allowSearch: false,
    });

    const last = assembled.messages.at(-1);
    expect(last?.role).toBe("user");
    expect(last?.content).toBe("the newest thing");
  });
});

describe("token budget", () => {
  it("estimates tokens from characters", () => {
    expect(estimateTokens("x".repeat(PROMPT_BUDGET.charsPerToken * 10))).toBe(10);
  });

  it("accepts a prompt that fits", () => {
    expect(withinBudget({ persona: "short", directive: "also short" })).toBe(true);
  });

  it("sheds optional context rather than blowing the budget", () => {
    const chunk = "x".repeat(Math.floor(PROMPT_BUDGET.maxChars / 3));
    const trimmed = trimToBudget({
      persona: chunk,
      state: "[Character State: ...]",
      chronicle: chunk,
      recall: chunk,
      lore: chunk,
      web: chunk,
      directive: "keep me",
    });

    expect(withinBudget(trimmed)).toBe(true);
    expect(trimmed.persona).toBe(chunk);
    expect(trimmed.state).toBe("[Character State: ...]");
    expect(trimmed.directive).toBe("keep me");
  });

  it("sheds in reverse priority, so web goes before the chronicle", () => {
    const chunk = "x".repeat(Math.floor(PROMPT_BUDGET.maxChars / 3));
    const trimmed = trimToBudget({
      persona: "short",
      state: "short",
      chronicle: chunk,
      recall: chunk,
      lore: chunk,
      web: chunk,
      directive: "short",
    });

    expect(trimmed.web).toBe("");
    expect(trimmed.chronicle).toBe(chunk);
  });

  it("never silently truncates the persona, and says so instead", () => {
    const oversized = "x".repeat(PROMPT_BUDGET.maxChars + 1);
    const trimmed = trimToBudget({
      persona: oversized,
      state: "s",
      chronicle: "c",
      recall: "r",
      lore: "l",
      web: "w",
      directive: "d",
    });

    expect(trimmed.persona).toBe(oversized);
    expect(withinBudget(trimmed)).toBe(false);
  });

  it("keeps a real assembled prompt inside the budget", async () => {
    for (let index = 0; index < 60; index += 1) {
      appendMessage(CHARACTER_ID, index % 2 === 0 ? "user" : "assistant", "x".repeat(300));
    }

    const assembled = await assemblePrompt({
      characterId: CHARACTER_ID,
      userText: "tell me about the pendant",
      allowSearch: false,
    });

    expect(withinBudget(assembled.sections)).toBe(true);
    expect(estimateTokens(assembled.messages[0]?.content ?? "")).toBeLessThanOrEqual(
      PROMPT_BUDGET.maxChars / PROMPT_BUDGET.charsPerToken,
    );
  });
});

describe("web search triggering", () => {
  it("fires on temporal markers", () => {
    expect(hasTemporalMarker("What is the weather like in Tokyo right now?")).toBe(true);
    expect(hasTemporalMarker("who won the game")).toBe(true);
    expect(hasTemporalMarker("what happened in 2026")).toBe(true);
    expect(hasTemporalMarker("search up the release date")).toBe(true);
  });

  it("stays quiet on ordinary conversation", () => {
    expect(hasTemporalMarker("how are you feeling?")).toBe(false);
    expect(hasTemporalMarker("tell me about your mother")).toBe(false);
  });

  it("never searches when the reader turned it off", () => {
    expect(shouldSearchWeb("what is the weather in Tokyo right now?", false)).toBe(false);
    expect(shouldSearchWeb("what is the weather in Tokyo right now?", true)).toBe(true);
  });
});
