import { describe, expect, it } from "bun:test";
import { isPromptLike } from "@/services/prompt-writer";
import { inferOrientation, sceneField, whoElse } from "@/services/selfie";

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

describe("scene fields the planner overran", () => {
  it("caps a field the model wrote as a sentence", () => {
    expect(
      sceneField("a warm sunlit kitchen with copper pans and a long oak table by the window"),
    ).toBe("a warm sunlit kitchen with copper pans and");
  });

  it("leaves a short field alone", () => {
    expect(sceneField("at the kitchen counter")).toBe("at the kitchen counter");
  });

  it("drops an others field that describes the room instead of a person", () => {
    expect(whoElse("An empty glass jar on the counter, a dish towel hanging from the rail")).toBe(
      "",
    );
    expect(whoElse("Her cat, Luna, is curled up on the bed")).toBe("");
  });

  it("keeps an others field that actually names someone", () => {
    expect(whoElse("her sister")).toBe("her sister");
    expect(whoElse("a poodle")).toBe("a poodle");
  });

  it("returns nothing for an empty others field", () => {
    expect(whoElse("")).toBe("");
    expect(whoElse("   ")).toBe("");
  });
});

describe("who else is in the frame", () => {
  it("says nobody when the planner says None", () => {
    expect(whoElse("None")).toBe("");
  });

  it("says nobody when the planner qualifies it", () => {
    // A reader saw "with None, just me at the kitchen of my home" before this.
    expect(whoElse("None, just me")).toBe("");
    expect(whoElse("Nobody, she is alone")).toBe("");
    expect(whoElse("no one, it is only her")).toBe("");
  });

  it("still names a real person", () => {
    expect(whoElse("her sister Mara")).toBe("her sister Mara");
  });
});
