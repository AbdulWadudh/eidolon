import { describe, expect, it } from "bun:test";
import { createOutputTags } from "@/ws/output-tags";

function streamed(chunks: string[]): { shown: string; visual: string } {
  const tags = createOutputTags();
  let shown = "";
  for (const chunk of chunks) shown += tags.push(chunk);
  shown += tags.flush();
  return { shown, visual: tags.visualPrompt() };
}

describe("a reply with no tags in it", () => {
  it("passes straight through, which is the usual turn", () => {
    const { shown, visual } = streamed(["Hey. ", "How was ", "your day?"]);
    expect(shown).toBe("Hey. How was your day?");
    expect(visual).toBe("");
  });

  it("does not swallow an angle bracket that starts nothing", () => {
    const { shown } = streamed(["a < b, and 3 <speec", "hless"]);
    expect(shown).toBe("a < b, and 3 <speechless");
  });
});

describe("separating what she says from what gets rendered", () => {
  it("unwraps speech and swallows the visual prompt whole", () => {
    const { shown, visual } = streamed([
      "<speech>Look at this.</speech>",
      "<visual_prompt>a woman on a balcony at dusk</visual_prompt>",
    ]);
    expect(shown).toBe("Look at this.");
    expect(visual).toBe("a woman on a balcony at dusk");
  });

  it("holds a tag back until it closes, rather than leaking half of it", () => {
    const tags = createOutputTags();
    expect(tags.push("Look. <vis")).toBe("Look. ");
    expect(tags.push("ual_prompt>a bal")).toBe("");
    expect(tags.push("cony</visual_pro")).toBe("");
    expect(tags.push("mpt> ok")).toBe(" ok");
    expect(tags.flush()).toBe("");
    expect(tags.visualPrompt()).toBe("a balcony");
  });

  it("keeps the user's half when only the speech tag is used", () => {
    const { shown, visual } = streamed(["<speech>", "Just this.", "</speech>"]);
    expect(shown).toBe("Just this.");
    expect(visual).toBe("");
  });

  it("does not lose an unclosed visual prompt at the end of a stream", () => {
    const { shown, visual } = streamed(["Here. <visual_prompt>a kitchen"]);
    expect(shown).toBe("Here. ");
    expect(visual).toBe("a kitchen");
  });
});

describe("chat template tokens never reach the user", () => {
  it("drops a stop token the sampler let through", () => {
    const { shown } = streamed(["All done.", "<|im_end|>"]);
    expect(shown).toBe("All done.");
  });

  it("drops one split across two tokens", () => {
    const { shown } = streamed(["All done.<|im", "_end|>"]);
    expect(shown).toBe("All done.");
  });
});
