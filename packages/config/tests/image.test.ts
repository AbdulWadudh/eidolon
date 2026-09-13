import { describe, expect, it } from "bun:test";
import { IMAGE_PRESETS } from "../src/image";

describe("every image preset finishes above a phone screen", () => {
  const PHONE_WIDTH_PX = 1080;

  for (const [key, preset] of Object.entries(IMAGE_PRESETS)) {
    it(`${key} renders wider than the display it is shown on`, () => {
      const scale = preset.hiresScale > 1 ? preset.hiresScale : 1;
      const finished = preset.widthPx * scale;

      expect(finished).toBeGreaterThanOrEqual(PHONE_WIDTH_PX);
    });

    it(`${key} lands on dimensions the sampler accepts`, () => {
      const scale = preset.hiresScale > 1 ? preset.hiresScale : 1;

      for (const side of [preset.widthPx, preset.heightPx, preset.squarePx]) {
        expect(Math.round((side * scale) / 8) * 8).toBe(side * scale);
      }
    });

    it(`${key} never upscales with the blockiest method`, () => {
      if (preset.hiresScale > 1) expect(preset.hiresUpscaleMethod).not.toBe("nearest-exact");
    });
  }
});
