import { describe, expect, it } from "bun:test";
import { parseServerMessage } from "../src";

const SHIFT = {
  type: "stage_shift",
  payload: {
    location_name: "a launderette at midnight",
    backdrop_url: "https://example.com/scene.webp",
    lighting_tint: "#F08C00",
    soundscape_stems: [],
  },
};

describe("a moment reaches the user whether or not it may repaint the background", () => {
  it("is accepted when the scene may replace the background", () => {
    const parsed = parseServerMessage({
      ...SHIFT,
      payload: { ...SHIFT.payload, replaces_background: true },
    });

    expect(parsed.type).toBe("stage_shift");
  });

  it("is still accepted when the user keeps their own background", () => {
    const parsed = parseServerMessage({
      ...SHIFT,
      payload: { ...SHIFT.payload, replaces_background: false },
    });

    expect(parsed.type).toBe("stage_shift");
  });

  it("assumes the scene may repaint when the sender says nothing", () => {
    const parsed = parseServerMessage(SHIFT) as { payload?: { replaces_background?: boolean } };

    expect(parsed.payload?.replaces_background).toBe(true);
  });

  it("refuses a moment carrying no backdrop at all, which is what broke it", () => {
    expect(() =>
      parseServerMessage({ ...SHIFT, payload: { ...SHIFT.payload, backdrop_url: null } }),
    ).toThrow();
  });
});
