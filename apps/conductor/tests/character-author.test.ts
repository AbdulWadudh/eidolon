import { beforeAll, describe, expect, it } from "bun:test";
import { AUTHORING } from "@eidolon/config";
import { getPrompt, loadPrompts } from "@/prompts/store";
import {
  buildAuthorPrompt,
  buildContext,
  exampleAnswers,
  isOverblown,
  isUsableAuthored,
  shapeAuthored,
  stripExampleLines,
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
