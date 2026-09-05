import { beforeEach, describe, expect, it } from "bun:test";
import { DEFAULT_THEME_TOKENS } from "@eidolon/tokens";
import { mockMemory } from "./support/mock-native";

const { useThemeStore, tokensToCssVars } = await import("../store/theme-store");

describe("Theme tokens -> CSS variables", () => {
  beforeEach(() => {
    mockMemory.clear();
    useThemeStore.getState().resetGlobalTheme();
    useThemeStore.setState({ characterThemes: {}, activeCharacterId: null });
  });

  describe("tokensToCssVars mapping", () => {
    it("maps default tokens to standard CSS variables and Tailwind v4 aliases", () => {
      const cssVars = tokensToCssVars(DEFAULT_THEME_TOKENS);

      // Surfaces
      expect(cssVars["--canvas"]).toBe(DEFAULT_THEME_TOKENS.canvas);
      expect(cssVars["--color-canvas"]).toBe(DEFAULT_THEME_TOKENS.canvas);
      expect(cssVars["--card"]).toBe(DEFAULT_THEME_TOKENS.card);
      expect(cssVars["--color-card"]).toBe(DEFAULT_THEME_TOKENS.card);
      expect(cssVars["--card-border"]).toBe(DEFAULT_THEME_TOKENS.cardBorder);
      expect(cssVars["--color-card-border"]).toBe(DEFAULT_THEME_TOKENS.cardBorder);
      expect(cssVars["--border"]).toBe(DEFAULT_THEME_TOKENS.cardBorder);
      expect(cssVars["--color-border"]).toBe(DEFAULT_THEME_TOKENS.cardBorder);
      expect(cssVars["--input"]).toBe(DEFAULT_THEME_TOKENS.inputSurface);
      expect(cssVars["--color-input"]).toBe(DEFAULT_THEME_TOKENS.inputSurface);

      // Text & Brand
      expect(cssVars["--text-primary"]).toBe(DEFAULT_THEME_TOKENS.textPrimary);
      expect(cssVars["--primary"]).toBe(DEFAULT_THEME_TOKENS.primary);
      expect(cssVars["--color-primary"]).toBe(DEFAULT_THEME_TOKENS.primary);
      expect(cssVars["--secondary"]).toBe(DEFAULT_THEME_TOKENS.secondary);
      expect(cssVars["--color-secondary"]).toBe(DEFAULT_THEME_TOKENS.secondary);
      expect(cssVars["--secondary-foreground"]).toBe(DEFAULT_THEME_TOKENS.secondaryForeground);
      expect(cssVars["--color-secondary-foreground"]).toBe(
        DEFAULT_THEME_TOKENS.secondaryForeground,
      );

      // Semantics
      expect(cssVars["--success"]).toBe(DEFAULT_THEME_TOKENS.success);
      expect(cssVars["--warning"]).toBe(DEFAULT_THEME_TOKENS.warning);
      expect(cssVars["--danger"]).toBe(DEFAULT_THEME_TOKENS.danger);

      // Geometry
      expect(cssVars["--radius"]).toBe(`${DEFAULT_THEME_TOKENS.radius}px`);
      expect(cssVars["--radius-card"]).toBe(`${DEFAULT_THEME_TOKENS.radius}px`);
      expect(cssVars["--radius-button"]).toBe(`${DEFAULT_THEME_TOKENS.radius}px`);
      expect(cssVars["--radius-input"]).toBe(`${DEFAULT_THEME_TOKENS.radius}px`);
      expect(cssVars["--border-width"]).toBe(`${DEFAULT_THEME_TOKENS.borderWidth}px`);
    });

    it("handles arbitrary custom radius numbers correctly", () => {
      const customTheme = {
        ...DEFAULT_THEME_TOKENS,
        radius: 22,
        borderWidth: 2,
      };
      const cssVars = tokensToCssVars(customTheme);

      expect(cssVars["--radius"]).toBe("22px");
      expect(cssVars["--radius-card"]).toBe("22px");
      expect(cssVars["--radius-button"]).toBe("22px");
      expect(cssVars["--radius-input"]).toBe("22px");
      expect(cssVars["--border-width"]).toBe("2px");
    });
  });

  describe("Text scale", () => {
    it("publishes the type scale as pixel values that follow fontScale", () => {
      const base = tokensToCssVars(DEFAULT_THEME_TOKENS);
      expect(base["--text-base"]).toBe("14px");
      expect(base["--text-xs"]).toBe("10.5px");
      expect(base["--font-scale"]).toBe("1");

      const scaled = tokensToCssVars({ ...DEFAULT_THEME_TOKENS, fontScale: 1.5 });
      expect(scaled["--text-base"]).toBe("21px");
      expect(scaled["--text-2xl"]).toBe("31.5px");
      expect(scaled["--font-scale"]).toBe("1.5");
    });

    it("derives the bold and italic families from the base family", () => {
      const cssVars = tokensToCssVars({
        ...DEFAULT_THEME_TOKENS,
        fontMain: "PlayfairDisplay-Regular",
        fontUI: "monospace",
      });
      expect(cssVars["--font-main-bold"]).toBe("PlayfairDisplay-Bold");
      expect(cssVars["--font-main-italic"]).toBe("PlayfairDisplay-Italic");
      // platform families have no variant suffix, so they pass through unchanged
      expect(cssVars["--font-ui-bold"]).toBe("monospace");
    });
  });
});
