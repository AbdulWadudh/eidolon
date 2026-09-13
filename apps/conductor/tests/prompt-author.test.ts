import { describe, expect, it } from "bun:test";
import { missingVariables, shapePromptText } from "@/services/prompt-author";

describe("shaping what the model wrote for a prompt", () => {
  it("strips a markdown fence the model wrapped it in", () => {
    const raw = "```\nYou are {{name}}. Be brief.\n```";
    expect(shapePromptText(raw)).toBe("You are {{name}}. Be brief.");
  });

  it("strips a language-tagged fence too", () => {
    expect(shapePromptText("```text\nBe brief.\n```")).toBe("Be brief.");
  });

  it("drops a leading label the model added", () => {
    expect(shapePromptText("Prompt: Be brief.")).toBe("Be brief.");
    expect(shapePromptText("Write the prompt: Be brief.")).toBe("Be brief.");
  });

  it("drops wrapping quotation marks", () => {
    expect(shapePromptText('"Be brief."')).toBe("Be brief.");
  });

  it("keeps interior newlines, because a prompt is written in lines", () => {
    const written = shapePromptText("One rule.\nAnother rule.");
    expect(written).toBe("One rule.\nAnother rule.");
  });

  it("leaves a placeholder untouched", () => {
    expect(shapePromptText("You are {{name}}, and {{they}} {{is}} tired.")).toBe(
      "You are {{name}}, and {{they}} {{is}} tired.",
    );
  });
});

describe("the placeholder guard", () => {
  it("reports nothing missing when every placeholder survived", () => {
    expect(missingVariables("You are {{name}}. {{personality}}", ["name", "personality"])).toEqual(
      [],
    );
  });

  it("names the placeholder the model dropped", () => {
    expect(missingVariables("You are {{name}}.", ["name", "mood"])).toEqual(["mood"]);
  });

  it("does not accept a placeholder the model reworded", () => {
    expect(missingVariables("You are {{ name }}.", ["name"])).toEqual(["name"]);
    expect(missingVariables("You are {name}.", ["name"])).toEqual(["name"]);
    expect(missingVariables("You are NAME.", ["name"])).toEqual(["name"]);
  });

  it("is satisfied by a prompt that takes no placeholders", () => {
    expect(missingVariables("Be brief.", [])).toEqual([]);
  });
});
