import { describe, expect, it } from "bun:test";
import { SENTENCE_BUFFER, SILENT_MP3, silentMp3FrameCount } from "@eidolon/config";
import { silentMp3 } from "@/services/voice";
import {
  createSentenceBuffer,
  speakableSentence,
  splitSpokenSentences,
} from "@/utils/sentence-buffer";

function pushAll(text: string, size = 3): string[] {
  const buffer = createSentenceBuffer();
  const emitted: string[] = [];
  for (let at = 0; at < text.length; at += size) {
    emitted.push(...buffer.push(text.slice(at, at + size)));
  }
  emitted.push(...buffer.flush());
  return emitted;
}

describe("speakableSentence", () => {
  it("drops stage directions wrapped in asterisks", () => {
    expect(speakableSentence("*she leans in* You came back.")).toBe("You came back.");
  });

  it("drops a line that is nothing but a stage direction", () => {
    expect(speakableSentence("*smiles quietly*")).toBe("");
  });

  it("drops an unclosed asterisk rather than speaking it", () => {
    expect(speakableSentence("Careful *she starts")).toBe("Careful she starts");
  });

  it("collapses the whitespace a stripped direction leaves behind", () => {
    expect(speakableSentence("Hey.   *pause*   Come in.")).toBe("Hey. Come in.");
  });
});

describe("createSentenceBuffer", () => {
  it("emits nothing until a boundary arrives", () => {
    const buffer = createSentenceBuffer();
    expect(buffer.push("I was just")).toEqual([]);
    expect(buffer.push(" thinking about you")).toEqual([]);
    expect(buffer.push(".")).toEqual(["I was just thinking about you."]);
  });

  it("splits on every configured boundary", () => {
    for (const boundary of SENTENCE_BUFFER.boundaries) {
      const buffer = createSentenceBuffer();
      const expected = boundary.trim().length > 0 ? `Stay${boundary}` : "Stay";
      expect(buffer.push(`Stay${boundary}next`)).toEqual([expected]);
    }
  });

  it("keeps sentence punctuation with the sentence", () => {
    expect(splitSpokenSentences("Wait. Really? Yes!")).toEqual(["Wait.", "Really?", "Yes!"]);
  });

  it("treats a run of punctuation as one boundary", () => {
    expect(splitSpokenSentences("Oh... I see.")).toEqual(["Oh...", "I see."]);
  });

  it("keeps a closing quote with the sentence it closes", () => {
    expect(splitSpokenSentences('She said "no." Then she left.')).toEqual([
      'She said "no."',
      "Then she left.",
    ]);
  });

  it("ignores punctuation inside a stage direction", () => {
    expect(splitSpokenSentences("*she laughs. loudly.* That is unfair.")).toEqual([
      "That is unfair.",
    ]);
  });

  it("strips directions that sit between two spoken sentences", () => {
    expect(splitSpokenSentences("Hi. *she waves* Bye.")).toEqual(["Hi.", "Bye."]);
  });

  it("holds an open direction back until it closes", () => {
    const buffer = createSentenceBuffer();
    expect(buffer.push("*she turns away. slowly")).toEqual([]);
    expect(buffer.push("* Fine.")).toEqual(["Fine."]);
  });

  it("emits the same sentences however the tokens are chopped up", () => {
    const line = "*grins* You are late. Again! Sit down.";
    expect(pushAll(line, 1)).toEqual(pushAll(line, 7));
    expect(pushAll(line, 1)).toEqual(["You are late.", "Again!", "Sit down."]);
  });

  it("never emits a fragment shorter than the speakable floor", () => {
    expect(splitSpokenSentences(". Hello there.")).toEqual(["Hello there."]);
    expect(splitSpokenSentences("*nods* Hello there.")).toEqual(["Hello there."]);
  });

  it("cuts a runaway sentence at a word break rather than buffering for ever", () => {
    const runaway = "word ".repeat(200);
    const emitted = createSentenceBuffer().push(runaway);
    expect(emitted.length).toBeGreaterThan(0);
    expect((emitted[0] ?? "").length).toBeLessThanOrEqual(SENTENCE_BUFFER.maxBufferChars);
  });

  it("flushes a trailing sentence that never got its punctuation", () => {
    const buffer = createSentenceBuffer();
    expect(buffer.push("Do not go")).toEqual([]);
    expect(buffer.flush()).toEqual(["Do not go"]);
  });

  it("reports what is still held back", () => {
    const buffer = createSentenceBuffer();
    buffer.push("Hold. this");
    expect(buffer.pending()).toBe(" this");
  });
});

describe("silentMp3", () => {
  it("is a whole number of frames covering the fallback duration", () => {
    const audio = silentMp3();
    expect(audio.byteLength).toBe(silentMp3FrameCount() * SILENT_MP3.frameBytes);
    expect(audio.byteLength % SILENT_MP3.frameBytes).toBe(0);
  });

  it("starts every frame with a valid MPEG sync word", () => {
    const audio = silentMp3();
    for (let at = 0; at < audio.byteLength; at += SILENT_MP3.frameBytes) {
      expect(audio[at]).toBe(0xff);
      expect((audio[at + 1] ?? 0) & 0xe0).toBe(0xe0);
    }
  });
});
