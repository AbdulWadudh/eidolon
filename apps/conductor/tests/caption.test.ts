import { describe, expect, it } from "bun:test";
import { firstCaption, usableCaption } from "@/services/photo-caption";

describe("photo captions", () => {
  it("keeps an offhand remark", () => {
    expect(usableCaption("ok she has fully taken over the bed", "Emma")).toBe(true);
    expect(usableCaption("worth the early start", "Emma")).toBe(true);
  });

  it("drops anything that narrates the frame", () => {
    expect(usableCaption("The photo shows my cat on the couch", "Emma")).toBe(false);
    expect(usableCaption("Here is a picture of the beach", "Emma")).toBe(false);
    expect(usableCaption("A photo of my dog is attached", "Emma")).toBe(false);
  });

  it("drops the planner's own notes", () => {
    expect(usableCaption("[My sister at the beach, sunbathing]", "Emma")).toBe(false);
    expect(usableCaption("*sends a photo*", "Emma")).toBe(false);
  });

  it("drops a line written as the person receiving it", () => {
    expect(usableCaption("why did you send me this pic", "Emma")).toBe(false);
    expect(usableCaption("wish you were here to give me a cuddle", "Emma")).toBe(false);
  });

  it("drops a meta answer about the caption itself", () => {
    expect(usableCaption("Here is a message I might send along with that photo:", "Emma")).toBe(
      false,
    );
    expect(usableCaption("Caption: at the beach", "Emma")).toBe(false);
  });

  it("drops third person and rambling", () => {
    expect(usableCaption("Emma smiles at the camera", "Emma")).toBe(false);
    expect(
      usableCaption(
        "I thought of you when I saw this adorable cat napping in my living room today",
        "Emma",
      ),
    ).toBe(false);
  });
});

describe("taking a caption out of a paragraph", () => {
  it("keeps whole sentences and drops the truncated tail", () => {
    expect(
      firstCaption(
        "Hey! Looks like Mittens is lounging on my sofa today. She sure does love nap",
        14,
      ),
    ).toBe("Hey! Looks like Mittens is lounging on my sofa today.");
  });

  it("stops at the word budget rather than running on", () => {
    const long = "One two three. Four five six seven eight nine ten. Eleven twelve thirteen.";
    expect(firstCaption(long, 8).split(/\s+/).length).toBeLessThanOrEqual(8);
  });

  it("keeps a single line that never had punctuation", () => {
    expect(firstCaption("worth the early start", 14)).toBe("worth the early start");
  });

  it("returns nothing for an empty reply", () => {
    expect(firstCaption("   ", 14)).toBe("");
  });
});
