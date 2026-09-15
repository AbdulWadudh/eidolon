import { beforeAll, describe, expect, it } from "bun:test";
import { AUTHORING } from "@eidolon/config";
import { getPrompt, loadPrompts } from "@/prompts/store";
import {
  buildAuthorPrompt,
  buildContext,
  clipToWord,
  exampleAnswers,
  isOverblown,
  isUsableAuthored,
  shapeAuthored,
  stripExampleLines,
  templateKey,
  trimToCompleteSentence,
  withoutFieldExamples,
} from "@/services/character-author";

beforeAll(async () => {
  await loadPrompts();
});

describe("the context the model is shown", () => {
  it("leaves out the field being written", () => {
    const context = buildContext({ name: "Mira", tagline: "old tagline" }, "tagline");
    expect(context).toContain("Name: Mira");
    expect(context).not.toContain("old tagline");
  });

  it("skips fields that are still empty", () => {
    expect(buildContext({ name: "Mira", rules: "   " }, "tagline")).toBe("Name: Mira");
  });

  it("is bounded, however much has been written", () => {
    const context = buildContext({ personality: "x".repeat(5000) }, "name");
    expect(context.length).toBeLessThanOrEqual(AUTHORING.maxContextChars);
  });
});

describe("the prompt", () => {
  it("ends with the field being asked for", () => {
    const prompt = buildAuthorPrompt("tagline", "suggest", "", "Name: Mira");
    expect(prompt.trimEnd().endsWith("Write the Tagline:")).toBe(true);
  });

  it("hands the model the space after the colon, so it answers on the same line", () => {
    for (const field of ["outfit", "place", "photo", "portrait", "tagline", "name"] as const) {
      expect(buildAuthorPrompt(field, "suggest", "", "")).toMatch(/: $/);
    }
  });

  it("shows the draft only when rewriting", () => {
    expect(buildAuthorPrompt("tagline", "suggest", "a draft", "")).not.toContain("a draft");
    expect(buildAuthorPrompt("tagline", "enhance", "a draft", "")).toContain("a draft");
  });
});

describe("dropping the same-field example", () => {
  it("removes the example that answers the field being asked for", () => {
    const kept = withoutFieldExamples(getPrompt("authoring.enhance"), "Tagline");
    expect(kept).not.toContain("mid-book");
  });

  it("keeps the examples for other fields, so the format still shows", () => {
    const kept = withoutFieldExamples(getPrompt("authoring.enhance"), "Tagline");
    expect(kept).toContain("Field: Rules");
    expect(kept).toContain("Write the Rules:");
  });

  it("keeps the instructions above the examples", () => {
    const kept = withoutFieldExamples(getPrompt("authoring.suggest"), "Name");
    expect(kept).toContain("You are helping write a character card");
    expect(kept).not.toContain("Tarek Mansour");
  });

  it("leaves a template alone when it has no example for that field", () => {
    const kept = withoutFieldExamples(getPrompt("authoring.enhance"), "Greeting");
    expect(kept).toContain("Write the Rules:");
    expect(kept).toContain("Write the Tagline:");
  });
});

describe("recognising the prompt's own answers", () => {
  it("collects every worked answer, including multi-line ones", () => {
    const answers = exampleAnswers(getPrompt("authoring.enhance"));
    expect(answers.has("warm, quick to laugh, always mid-book")).toBe(true);
    expect(answers.has("never uses emoji.")).toBe(true);
  });

  it("refuses an answer that only repeats one", () => {
    const answers = new Set(["warm, quick to laugh, always mid-book"]);
    expect(isUsableAuthored("suggest", "", "warm, quick to laugh, always mid-book", answers)).toBe(
      false,
    );
  });

  it("drops the copied lines and keeps the written one", () => {
    const answers = new Set(["never uses emoji."]);
    expect(stripExampleLines("Never uses emoji.\nNever answers the phone.", answers)).toBe(
      "Never answers the phone.",
    );
  });
});

describe("shaping what comes back", () => {
  it("takes one line for a single-line field and unwraps quotes", () => {
    expect(shapeAuthored("name", '"Mira Halloway"\nand more')).toBe("Mira Halloway");
  });

  it("keeps the line breaks in a field written a line at a time", () => {
    expect(shapeAuthored("rules", "Never lies.\nNever shouts.")).toBe("Never lies.\nNever shouts.");
  });

  it("strips a label the model added anyway", () => {
    expect(shapeAuthored("name", "Write: Mira Halloway")).toBe("Mira Halloway");
  });

  it("caps a field that ran long", () => {
    expect(shapeAuthored("name", "x".repeat(200)).length).toBeLessThanOrEqual(
      AUTHORING.fields.name.maxChars,
    );
  });
});

describe("refusing a bad rewrite", () => {
  it("drops a sentence the model did not finish", () => {
    expect(trimToCompleteSentence("She is calm. She wakes up and")).toBe("She is calm.");
  });

  it("leaves a finished sentence alone", () => {
    expect(trimToCompleteSentence("She is calm.")).toBe("She is calm.");
  });

  it("leaves an action ending alone", () => {
    expect(trimToCompleteSentence("*shrugs*")).toBe("*shrugs*");
  });

  it("calls out a rewrite that grew far past the draft", () => {
    const draft = "we live in the same building";
    expect(isOverblown(draft, `${draft}. ${"And another invented fact. ".repeat(20)}`)).toBe(true);
  });

  it("lets a short draft become a proper sentence", () => {
    expect(isOverblown("she hosts radio", "She hosts a radio show through the night.")).toBe(false);
  });

  it("refuses a rewrite that changed nothing", () => {
    expect(isUsableAuthored("enhance", "She is calm.", "she is calm.")).toBe(false);
  });

  it("accepts a suggestion that matches nothing", () => {
    expect(isUsableAuthored("suggest", "", "Mira Halloway")).toBe(true);
  });
});

describe("clipping to the last whole word", () => {
  it("leaves text that already fits", () => {
    expect(clipToWord("a navy wool coat", 90)).toBe("a navy wool coat");
  });

  it("never cuts a word in half", () => {
    expect(clipToWord("the fog rolling over the Setubal docks at dawn", 30)).toBe(
      "the fog rolling over the",
    );
  });

  it("drops the punctuation the cut left dangling", () => {
    expect(clipToWord("black coat, salt-stained cuffs, worn boots", 20)).toBe("black coat");
  });

  it("falls back to a hard cut when one word fills the whole budget", () => {
    expect(clipToWord("supercalifragilistic", 8)).toBe("supercal");
  });
});

describe("the growth guard scales with the field", () => {
  it("still catches a runaway rewrite of a small field", () => {
    expect(isOverblown("a woman who works on boats", "x".repeat(400), 90)).toBe(true);
  });

  it("lets a long field have the length its own shape asks for", () => {
    const draft = "shes blunt and doesnt like small talk. good at her job";
    const three = "She cuts small talk short and speaks in straight lines. ".repeat(6);
    expect(isOverblown(draft, three, 0)).toBe(true);
    expect(isOverblown(draft, three, 700)).toBe(false);
  });

  it("is unchanged when no field budget is given", () => {
    expect(isOverblown("she hosts radio", "She hosts a radio show through the night.")).toBe(false);
  });
});

describe("the example set matches the template that was used", () => {
  it("reads the visual templates for a visual field", () => {
    expect(templateKey("photo", "suggest")).toBe("authoring.suggestVisual");
    expect(templateKey("outfit", "enhance")).toBe("authoring.enhanceVisual");
  });

  it("reads the card templates for a written field", () => {
    expect(templateKey("tagline", "suggest")).toBe("authoring.suggest");
    expect(templateKey("personality", "enhance")).toBe("authoring.enhance");
  });

  it("knows the answers a visual prompt offers, so a copy of one is caught", () => {
    const answers = exampleAnswers(getPrompt(templateKey("outfit", "suggest")));
    expect(answers.has("oversized grey knit, sleeves pushed past the elbows")).toBe(true);
  });

  it("does not mistake a card answer for a visual one", () => {
    const visual = exampleAnswers(getPrompt(templateKey("outfit", "suggest")));
    expect(visual.has("warm, quick to laugh, always mid-book")).toBe(false);
  });
});
