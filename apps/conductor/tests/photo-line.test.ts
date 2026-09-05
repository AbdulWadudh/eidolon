import { describe, expect, it } from "bun:test";
import { asPhotoNote, forHistory, isPhotoLine, photoLine } from "@/services/photo-line";
import { isActionOnly, spokenWords } from "@/services/reply-length";

describe("photo lines in history", () => {
  it("recognises a photo message", () => {
    expect(isPhotoLine("*sends a photo*")).toBe(true);
    expect(isPhotoLine("*sends a photo of her sister at the overlook*")).toBe(true);
    expect(isPhotoLine("*smiles*")).toBe(false);
  });

  it("rewrites a photo into a note so the model does not imitate the asterisks", () => {
    expect(asPhotoNote("*sends a photo of her dog at the park*")).toBe(
      "[photo attached: her dog at the park]",
    );
    expect(asPhotoNote("*sends a photo*")).toBe("[photo attached]");
  });

  it("leaves ordinary replies alone", () => {
    expect(asPhotoNote("*grins* Missed you.")).toBe("*grins* Missed you.");
    expect(forHistory("user", "*sends a photo*")).toBe("*sends a photo*");
  });

  it("keeps what she said and notes the photo beside it", () => {
    expect(forHistory("assistant", "The light was unreal up there.", "a coastal overlook")).toBe(
      "The light was unreal up there. [photo attached: a coastal overlook]",
    );
  });

  it("does not double the note when the message was only the marker", () => {
    expect(forHistory("assistant", "*sends a photo*", "her dog")).toBe("[photo attached: her dog]");
  });

  it("round trips a caption", () => {
    expect(photoLine("the view from the hike")).toBe("*sends a photo of the view from the hike*");
    expect(photoLine("")).toBe("*sends a photo*");
  });
});

describe("replies that never speak", () => {
  it("catches a reply that is only a stage direction", () => {
    expect(isActionOnly("*smiles*")).toBe(true);
    expect(isActionOnly("*blushes more*")).toBe(true);
    expect(isActionOnly("(laughs quietly)")).toBe(true);
  });

  it("accepts anything with words said out loud", () => {
    expect(isActionOnly("*smiles* Missed you.")).toBe(false);
    expect(isActionOnly("Missed you.")).toBe(false);
  });

  it("strips markup down to what was actually said", () => {
    expect(spokenWords("*grins* Come here. (softly)")).toBe("Come here.");
  });
});
