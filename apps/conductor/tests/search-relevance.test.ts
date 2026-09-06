import { beforeEach, describe, expect, it } from "bun:test";
import { PERSONA_GUARD } from "@eidolon/config";
import { loadPrompts } from "@/prompts/store";
import { leaksInstruction } from "@/services/persona-guard";
import { answersQuery, distinctiveTerms } from "@/services/search-relevance";

const NEBULA_AWARDS =
  "[Real-Time Web Reference Information]:\n- Title: Nebula Awards Finalist Announcement - SFWA\n  Summary: We are honored to introduce the winners of our latest Nebula Awards, presented at the 61st Annual ceremony.";

const IPL_RESULTS =
  "[Real-Time Web Reference Information]:\n- Title: Indian Premier League\n  Summary: The current champions are the Royal Challengers Bengaluru, who won the 2026 season after defeating the Gujarat Titans in the final.";

describe("distinctiveTerms", () => {
  it("keeps the long words that identify what was asked about", () => {
    expect(distinctiveTerms("who won the 2026 Zorbulon Nebula Cup final?")).toContain("zorbulon");
  });

  it("ignores words too short to judge on", () => {
    expect(distinctiveTerms("who won the ipl this year")).toEqual([]);
    expect(distinctiveTerms("what is the weather in tokyo right now")).toEqual([]);
  });

  it("ignores common temporal and sporting filler", () => {
    expect(distinctiveTerms("what is the weather tomorrow")).toEqual([]);
    expect(distinctiveTerms("who are the champions currently")).toEqual([]);
  });

  it("does not repeat a word", () => {
    expect(distinctiveTerms("zorbulon zorbulon zorbulon")).toEqual(["zorbulon"]);
  });
});

describe("answersQuery", () => {
  it("rejects results that never name what was asked about", () => {
    expect(answersQuery("who won the 2026 Zorbulon Nebula Cup final?", NEBULA_AWARDS)).toBe(false);
  });

  it("accepts results for a question with no distinctive word to check", () => {
    expect(answersQuery("who won the ipl this year?", IPL_RESULTS)).toBe(true);
  });

  it("accepts results that do name the distinctive word", () => {
    expect(answersQuery("what happened at Wimbledon", "Wimbledon finished on Sunday.")).toBe(true);
  });

  it("is not fooled by a near miss on a different subject", () => {
    expect(answersQuery("who won the Zorbulon final", "The Nebula Awards were presented.")).toBe(
      false,
    );
  });

  it("treats nothing at all as no answer", () => {
    expect(answersQuery("anything", "")).toBe(false);
    expect(answersQuery("anything", "   ")).toBe(false);
  });

  it("matches without regard to case", () => {
    expect(answersQuery("tell me about WIMBLEDON", "wimbledon starts in July.")).toBe(true);
  });
});

describe("leaksInstruction", () => {
  beforeEach(async () => {
    await loadPrompts();
  });

  it("catches the reminder the character once said out loud", () => {
    expect(
      leaksInstruction(
        "That was only a stage direction. Say something out loud this time. Reply again with actual words, the way you would type them to someone.",
      ),
    ).toBe(true);
  });

  it("catches a reminder echoed with different punctuation", () => {
    expect(leaksInstruction("that was only a stage direction, say something out loud")).toBe(true);
  });

  it("catches the repeat-yourself reminder", () => {
    expect(
      leaksInstruction("You just repeated something you already said earlier in this conversation"),
    ).toBe(true);
  });

  it("leaves an ordinary reply alone", () => {
    expect(leaksInstruction("RCB took it this year. They beat Gujarat in the final.")).toBe(false);
    expect(leaksInstruction("*smiles* Morning. How are you feeling?")).toBe(false);
  });

  it("leaves an empty reply alone", () => {
    expect(leaksInstruction("")).toBe(false);
    expect(leaksInstruction("   ")).toBe(false);
  });

  it("has a fallback to say instead", () => {
    expect(PERSONA_GUARD.spokenFallbacks.length).toBeGreaterThan(0);
  });
});
