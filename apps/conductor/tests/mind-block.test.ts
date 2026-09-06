import { describe, expect, it } from "bun:test";
import { hasMindBlock, parseMindBlock, stripMindBlock } from "@/orchestrator/mind-block";

const NEWLINE = String.fromCharCode(10);

describe("mind block parsing", () => {
  const REPLY_WITH_BLOCK = [
    "*grins* That is the best thing I have heard all week.",
    '[mind_update: {"affinity_delta": 2, "mood": "Warm", "new_memory": "He got the Lisbon job."}]',
  ].join(NEWLINE);

  it("reads a well formed trailing block", () => {
    expect(hasMindBlock(REPLY_WITH_BLOCK)).toBe(true);
    expect(stripMindBlock(REPLY_WITH_BLOCK)).toBe(
      "*grins* That is the best thing I have heard all week.",
    );

    const parsed = parseMindBlock(REPLY_WITH_BLOCK);
    expect(parsed?.affinityDelta).toBe(2);
    expect(parsed?.mood).toBe("Warm");
    expect(parsed?.newMemory).toBe("He got the Lisbon job.");
  });

  it("repairs malformed JSON through jsonrepair", () => {
    const raw = [
      "hi",
      "[mind_update: {affinity_delta: 3, mood: 'Playfully Teasing', new_memory: null,}]",
    ].join(NEWLINE);

    const parsed = parseMindBlock(raw);
    expect(parsed?.affinityDelta).toBe(3);
    expect(parsed?.mood).toBe("Playfully Teasing");
    expect(parsed?.newMemory).toBeNull();
  });

  it("clamps a delta the model exaggerated", () => {
    const high = parseMindBlock('x[mind_update: {"affinity_delta": 99, "mood": "Warm"}]');
    const low = parseMindBlock('x[mind_update: {"affinity_delta": -99, "mood": "Hurt"}]');
    expect(high?.affinityDelta).toBe(3);
    expect(low?.affinityDelta).toBe(-3);
  });

  it("trims a mood that ran long", () => {
    const parsed = parseMindBlock(
      'x[mind_update: {"affinity_delta": 0, "mood": "quietly and deeply moved"}]',
    );
    expect(parsed?.mood).toBe("quietly and");
  });

  it("returns null when there is no block at all", () => {
    expect(parseMindBlock("just a plain reply")).toBeNull();
    expect(hasMindBlock("just a plain reply")).toBe(false);
    expect(stripMindBlock("just a plain reply")).toBe("just a plain reply");
  });
});
