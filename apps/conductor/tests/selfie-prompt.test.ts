import { describe, expect, it } from "bun:test";
import { isPromptLike } from "@/services/prompt-writer";
import { inferOrientation } from "@/services/selfie";

describe("orientation", () => {
  it("goes wide when the place is the subject", () => {
    expect(inferOrientation("the view from that hike with your sister")).toBe("landscape");
    expect(inferOrientation("at the beach")).toBe("landscape");
  });

  it("stays upright for a photo of a person", () => {
    expect(inferOrientation("a selfie right now")).toBe("portrait");
    expect(inferOrientation("what you are wearing today")).toBe("portrait");
  });

  it("matches whole words only", () => {
    expect(inferOrientation("overview of my day")).toBe("portrait");
    expect(inferOrientation("parked outside")).toBe("portrait");
  });
});

describe("prompt guard", () => {
  it("rejects anything the model wrote in character", () => {
    expect(isPromptLike("*looks up from my phone* Hey there!")).toBe(false);
    expect(isPromptLike("I'm at the gym, thought you might like it")).toBe(false);
    expect(isPromptLike("How was your day?")).toBe(false);
  });

  it("accepts a plain visual line", () => {
    expect(isPromptLike("late twenties, dark wavy hair, warm brown eyes")).toBe(true);
  });
});
