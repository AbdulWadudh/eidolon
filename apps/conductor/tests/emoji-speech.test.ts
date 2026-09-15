import { describe, expect, it } from "bun:test";
import { speakableText } from "@/services/tts";
import { speakableSentence, stripEmoji } from "@/utils/sentence-buffer";

describe("emoji reach the user but never the voice", () => {
  it("takes a plain emoji out of the line", () => {
    expect(stripEmoji("Hey! 😊").trim()).toBe("Hey!");
  });

  it("takes out one built from a joined sequence, leaving no half of it behind", () => {
    const cleaned = stripEmoji("look 👩‍👩‍👧‍👦 lovely");
    expect(cleaned).not.toMatch(/\p{Extended_Pictographic}|‍/u);
    expect(cleaned.replace(/\s+/g, " ").trim()).toBe("look lovely");
  });

  it("takes out a skin-toned one", () => {
    expect(stripEmoji("nice 👍🏽").replace(/\s+/g, " ").trim()).toBe("nice");
  });

  it("leaves ordinary punctuation and accents alone", () => {
    expect(stripEmoji("Café — really? Yes… 3/5")).toBe("Café — really? Yes… 3/5");
  });

  it("strips them on the chat reply path, alongside the stage direction", () => {
    expect(speakableText("*grins* Missed you 🥺 so much ❤️")).toBe("Missed you so much");
  });

  it("strips them on the live call path too", () => {
    expect(speakableSentence("*waves* Hi there 👋")).toBe("Hi there");
  });

  it("does not leave a reply that is only emoji as something to synthesise", () => {
    expect(speakableText("😊😊😊")).toBe("");
  });
});
