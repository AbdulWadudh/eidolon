import { describe, expect, it } from "bun:test";
import { createReasoningFilter, leaksReasoning, stripReasoning } from "../src/services/reasoning";

function stream(chunks: string[], holdChars = 0): string {
  const filter = createReasoningFilter(holdChars);
  return chunks.map((chunk) => filter.push(chunk)).join("") + filter.flush();
}

describe("reasoning never reaches the reply", () => {
  it("drops a complete block and keeps what follows", () => {
    expect(stream(["<think>she is asking about the job</think>Nervous, obviously."])).toBe(
      "Nervous, obviously.",
    );
  });

  it("keeps what precedes the block", () => {
    expect(stream(["Hey. <think>hmm</think>You there?"])).toBe("Hey. You there?");
  });

  it("drops a block split across two chunks", () => {
    expect(stream(["<thi", "nk>weighing it up</thi", "nk>Go on then."])).toBe("Go on then.");
  });

  it("drops a block split one character at a time", () => {
    const raw = "<think>quietly</think>Fine.";
    expect(stream([...raw])).toBe("Fine.");
  });

  it("holds a closing tag that lands on a chunk boundary", () => {
    expect(stream(["<think>a", "</think", ">", "Yes."])).toBe("Yes.");
  });

  it("drops everything when the template opened inside the tag", () => {
    expect(stream(["she wants reassurance</think>I am here.", ""], 600)).toBe("I am here.");
  });

  it("drops an unopened block split across chunks", () => {
    expect(stream(["reading between", " the lines</thi", "nk>Come here."], 600)).toBe("Come here.");
  });

  it("releases held text when no reasoning ever arrives", () => {
    expect(stream(["Morning.", " Slept badly?"], 600)).toBe("Morning. Slept badly?");
  });

  it("stops holding once the lead budget is spent", () => {
    const long = "a".repeat(700);
    expect(stream([long], 600)).toBe(long);
  });

  it("drops an unterminated block rather than leaking it", () => {
    expect(stream(["<think>still going and it never closed"])).toBe("");
  });

  it("strips defensively when thinking was never requested", () => {
    expect(stream(["<think>uninvited</think>Hi."], 0)).toBe("Hi.");
  });

  it("keeps a reply that has no tags at all", () => {
    expect(stream(["*shrugs* ", "No idea."])).toBe("*shrugs* No idea.");
  });

  it("collects what it dropped so it can be inspected", () => {
    const filter = createReasoningFilter();
    filter.push("<think>the tell</think>Nothing.");
    filter.flush();
    expect(filter.reasoning()).toBe("the tell");
  });
});

describe("no fragment of a tag survives", () => {
  const cases = [
    ["<think>a</think>Said."],
    ["<thi", "nk>a</thi", "nk>Said."],
    ["a</think>Said."],
    ["<", "think", ">", "a", "<", "/think", ">", "Said."],
    ["<think>a</think>", "Said."],
  ];

  for (const chunks of cases) {
    it(`leaves nothing behind for ${JSON.stringify(chunks)}`, () => {
      const out = stream(chunks, 600);
      expect(leaksReasoning(out)).toBe(false);
      expect(out).not.toInclude("<");
      expect(out).toContain("Said.");
    });
  }
});

describe("stripping a whole completion at once", () => {
  it("removes a block from the middle", () => {
    expect(stripReasoning("<think>plan</think>warm grey knit")).toBe("warm grey knit");
  });

  it("removes an unopened block however long the lead", () => {
    expect(stripReasoning(`${"x".repeat(2000)}</think>the answer`)).toBe("the answer");
  });

  it("leaves clean text alone", () => {
    expect(stripReasoning("a corner cafe, steamed windows")).toBe("a corner cafe, steamed windows");
  });
});
