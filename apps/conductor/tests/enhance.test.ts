import { beforeEach, describe, expect, it } from "bun:test";
import { ENHANCE } from "@eidolon/config";
import { loadPrompts } from "@/prompts/store";
import {
  buildEnhancePrompt,
  canAddAction,
  EnhanceUnavailableError,
  enhanceMessage,
  hasAction,
  isUsableRewrite,
  keepOneAction,
  restoreInfluences,
  shapeEnhanced,
  shouldAddAction,
} from "@/services/enhance";

const NEWLINE = String.fromCharCode(10);

beforeEach(async () => {
  await loadPrompts();
});

describe("shapeEnhanced", () => {
  it("keeps a clean rewrite as it is", () => {
    expect(shapeEnhanced("Are you free later? I want to see you.")).toBe(
      "Are you free later? I want to see you.",
    );
  });

  it("strips a speaker label the model prepended", () => {
    expect(shapeEnhanced("PLAYER: are you free later?")).toBe("are you free later?");
    expect(shapeEnhanced("Rewrite: are you free later?")).toBe("are you free later?");
  });

  it("unwraps quotation marks", () => {
    expect(shapeEnhanced('"are you free later?"')).toBe("are you free later?");
    expect(shapeEnhanced("“are you free later?”")).toBe("are you free later?");
  });

  it("strips a code fence", () => {
    expect(shapeEnhanced("```\nare you free later?\n```")).toBe("are you free later?");
  });

  it("folds a multi-line answer into one message", () => {
    expect(shapeEnhanced(`line one${NEWLINE}${NEWLINE}line two`)).toBe("line one line two");
  });

  it("keeps an action inside its asterisks", () => {
    expect(shapeEnhanced("*leans in* say that again.")).toBe("*leans in* say that again.");
  });

  it("caps a runaway rewrite", () => {
    expect(shapeEnhanced("x".repeat(ENHANCE.maxOutputChars * 2)).length).toBe(
      ENHANCE.maxOutputChars,
    );
  });

  it("returns an empty string for empty output", () => {
    expect(shapeEnhanced("   ")).toBe("");
    expect(shapeEnhanced("")).toBe("");
  });
});

describe("isUsableRewrite", () => {
  it("rejects a rewrite that changed nothing", () => {
    expect(isUsableRewrite("hey there", "hey there")).toBe(false);
    expect(isUsableRewrite("hey there", "  HEY THERE  ")).toBe(false);
  });

  it("rejects an empty rewrite", () => {
    expect(isUsableRewrite("hey there", "")).toBe(false);
  });

  it("rejects a rewrite that is only a stage direction", () => {
    expect(isUsableRewrite("hey there", "*shrugs*")).toBe(false);
  });

  it("accepts a genuine rewrite", () => {
    expect(isUsableRewrite("hey there", "Hey — got a minute?")).toBe(true);
  });
});

describe("buildEnhancePrompt", () => {
  it("ends mid-pattern so the model completes a rewrite", () => {
    const prompt = buildEnhancePrompt("hey there");
    expect(prompt.endsWith(ENHANCE.rewriteLabel)).toBe(true);
    expect(prompt).toContain(`${ENHANCE.draftLabel} hey there`);
  });

  it("carries worked examples the model can follow", () => {
    const prompt = buildEnhancePrompt("hey there");
    expect(prompt).toContain("gonna be late sorry");
    expect(prompt).toContain("Never answer it");
  });

  it("puts the draft after every worked example", () => {
    const prompt = buildEnhancePrompt("the newest draft");
    expect(prompt.lastIndexOf(`${ENHANCE.draftLabel} the newest draft`)).toBeGreaterThan(
      prompt.lastIndexOf("Sentence: hey. bored. wanna talk?"),
    );
  });
});

describe("enhanceMessage", () => {
  it("refuses an empty draft without calling the model", () => {
    expect(enhanceMessage("   ")).rejects.toBeInstanceOf(EnhanceUnavailableError);
  });

  it("gives up rather than returning the draft unchanged when the model is unreachable", () => {
    expect(enhanceMessage("hey there", { signal: AbortSignal.abort() })).rejects.toBeInstanceOf(
      EnhanceUnavailableError,
    );
  });

  it("refuses a draft that is nothing but a nudge", () => {
    expect(enhanceMessage("<be nicer>")).rejects.toBeInstanceOf(EnhanceUnavailableError);
  });
});

describe("adding a stage direction", () => {
  it("offers one on a plain statement", () => {
    expect(canAddAction("ok fine you win")).toBe(true);
  });

  it("never adds a second action to a draft that already has one", () => {
    expect(canAddAction("*shrugs* ok fine you win")).toBe(false);
  });

  it("never adds one to a question, which the model answers instead", () => {
    expect(canAddAction("did you get the job??")).toBe(false);
  });

  it("respects the configured share of reworks", () => {
    expect(shouldAddAction("ok fine you win", 0)).toBe(true);
    expect(shouldAddAction("ok fine you win", ENHANCE.actionChance - 0.01)).toBe(true);
    expect(shouldAddAction("ok fine you win", ENHANCE.actionChance)).toBe(false);
    expect(shouldAddAction("ok fine you win", 0.99)).toBe(false);
  });

  it("never rolls the dice on a draft that cannot take one", () => {
    expect(shouldAddAction("did you get the job??", 0)).toBe(false);
    expect(shouldAddAction("*shrugs* whatever", 0)).toBe(false);
  });

  it("switches the worked examples when an action is wanted", () => {
    expect(buildEnhancePrompt("hey", true)).toContain("*winces*");
    expect(buildEnhancePrompt("hey", false)).not.toContain("*winces*");
  });

  it("keeps only the first action when the model writes several", () => {
    expect(keepOneAction("*grins* hello there *waves* again")).toBe("*grins* hello there again");
    expect(hasAction("*grins* hello")).toBe(true);
    expect(hasAction("plain words")).toBe(false);
  });

  it("caps a runaway action list through the shaper", () => {
    expect(shapeEnhanced("*a* one *b* two *c* three")).toBe("*a* one two three");
  });
});

describe("nudges", () => {
  it("puts a lifted nudge back in front of the rewrite", () => {
    expect(restoreInfluences("Tell me about your day.", ["be more affectionate"])).toBe(
      "<be more affectionate> Tell me about your day.",
    );
  });

  it("leaves a rewrite alone when there was no nudge", () => {
    expect(restoreInfluences("Tell me about your day.", [])).toBe("Tell me about your day.");
  });

  it("restores every nudge that was lifted", () => {
    expect(restoreInfluences("hello", ["be nicer", "be shorter"])).toBe(
      "<be nicer> <be shorter> hello",
    );
  });
});
