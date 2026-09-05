import { describe, expect, it } from "bun:test";
import "./support/mock-native";

const { parseRoleplay, splitTrailingWord } = await import("../lib/roleplay");
const { formatDuration, formatVoiceDuration } = await import("../lib/format");

describe("roleplay formatting", () => {
  it("splits dialogue from asterisk stage directions", () => {
    const segments = parseRoleplay("*She looks up.* You came back.");
    expect(segments.map((s) => [s.kind, s.text])).toEqual([
      ["narration", "She looks up."],
      ["dialogue", " You came back."],
    ]);
  });

  it("treats parenthesised actions as narration and keeps the brackets", () => {
    const segments = parseRoleplay("Hello (quietly) there");
    expect(segments.map((s) => s.kind)).toEqual(["dialogue", "narration", "dialogue"]);
    expect(segments[1].text).toBe("(quietly)");
  });

  it("keeps an unterminated stage direction as narration while it streams", () => {
    const segments = parseRoleplay("She waits. *reaching for the");
    expect(segments.at(-1)).toMatchObject({ kind: "narration", text: "reaching for the" });
  });

  it("splits the trailing word so only the newest token fades in", () => {
    const { settled, trailing } = splitTrailingWord(parseRoleplay("You came back"));
    expect(settled.map((s) => s.text).join("")).toBe("You came");
    expect(trailing?.text).toBe(" back");
  });
});

describe("duration formatting", () => {
  it("renders seconds as a clock label", () => {
    expect(formatDuration(3.2)).toBe("0:03");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(null)).toBe("0:00");
  });

  it("renders a voice note as seconds under a minute", () => {
    expect(formatVoiceDuration(3.6)).toBe('4"');
    expect(formatVoiceDuration(59)).toBe('59"');
    expect(formatVoiceDuration(null)).toBe('0"');
  });

  it("renders a voice note over a minute with a minute mark", () => {
    expect(formatVoiceDuration(75)).toBe("1'15\"");
    expect(formatVoiceDuration(600)).toBe("10'00\"");
  });
});
