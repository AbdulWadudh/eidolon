import { beforeEach, describe, expect, it, mock } from "bun:test";
import { DEFAULT_THEME_TOKENS } from "@eidolon/tokens";

// Mock react-native and react-native-mmkv
mock.module("react-native", () => ({
  Platform: { OS: "ios" },
}));

const mockMemory = new Map<string, string | boolean | number>();
mock.module("react-native-mmkv", () => ({
  createMMKV: () => ({
    getString: (key: string) => {
      const v = mockMemory.get(key);
      return typeof v === "string" ? v : undefined;
    },
    set: (key: string, val: string | boolean | number) => {
      mockMemory.set(key, val);
    },
    getBoolean: (key: string) => {
      const v = mockMemory.get(key);
      return typeof v === "boolean" ? v : undefined;
    },
    remove: (key: string) => {
      mockMemory.delete(key);
      return true;
    },
    delete: (key: string) => {
      mockMemory.delete(key);
    },
  }),
}));

// Import store after mocking
const { useThemeStore, tokensToCssVars } = await import("../store/theme-store");

describe("Dynamic Theme Engine & Store", () => {
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

  describe("Theme Resolution & Scoping", () => {
    it("returns default global theme when no character overrides exist", () => {
      const resolved = useThemeStore.getState().getResolvedTheme();
      expect(resolved).toEqual(DEFAULT_THEME_TOKENS);
    });

    it("merges character-specific overrides when active", () => {
      const store = useThemeStore.getState();
      store.updateCharacterToken("char_1", "primary", "#06B6D4");
      store.updateCharacterToken("char_1", "radius", 18);

      // Before setting active character
      const unselected = store.getResolvedTheme();
      expect(unselected.primary).toBe(DEFAULT_THEME_TOKENS.primary);
      expect(unselected.radius).toBe(DEFAULT_THEME_TOKENS.radius);

      // Resolving specifically for char_1
      const charResolved = store.getResolvedTheme("char_1");
      expect(charResolved.primary).toBe("#06B6D4");
      expect(charResolved.radius).toBe(18);
      expect(charResolved.canvas).toBe(DEFAULT_THEME_TOKENS.canvas);

      // After setting active character
      store.setActiveCharacter("char_1");
      const activeResolved = useThemeStore.getState().getResolvedTheme();
      expect(activeResolved.primary).toBe("#06B6D4");
      expect(activeResolved.radius).toBe(18);
    });

    it("generates dynamic CSS variables for active character with arbitrary overrides", () => {
      const store = useThemeStore.getState();
      store.updateCharacterToken("char_2", "primary", "#EC4899");
      store.updateCharacterToken("char_2", "radius", 25);
      store.setActiveCharacter("char_2");

      const cssVars = store.getDynamicCssVars();
      expect(cssVars["--primary"]).toBe("#EC4899");
      expect(cssVars["--color-primary"]).toBe("#EC4899");
      expect(cssVars["--radius"]).toBe("25px");
      expect(cssVars["--radius-card"]).toBe("25px");
      expect(cssVars["--radius-button"]).toBe("25px");
    });
  });

  describe("Global & Character Actions", () => {
    it("updates global tokens without affecting overrides", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("canvas", "#000000");

      expect(useThemeStore.getState().globalTheme.canvas).toBe("#000000");
      expect(useThemeStore.getState().getResolvedTheme().canvas).toBe("#000000");
    });

    it("promotes character overrides to global default and clears overrides", () => {
      const store = useThemeStore.getState();
      store.updateCharacterToken("char_3", "primary", "#10B981");
      store.updateCharacterToken("char_3", "radius", 14);

      store.promoteCharacterToGlobal("char_3");

      const updated = useThemeStore.getState();
      expect(updated.globalTheme.primary).toBe("#10B981");
      expect(updated.globalTheme.radius).toBe(14);
      expect(updated.characterThemes.char_3).toBeUndefined();
    });

    it("resets character overrides back to global defaults", () => {
      const store = useThemeStore.getState();
      store.updateCharacterToken("char_4", "primary", "#8B5CF6");
      expect(useThemeStore.getState().characterThemes.char_4?.primary).toBe("#8B5CF6");

      store.resetCharacterTheme("char_4");
      expect(useThemeStore.getState().characterThemes.char_4).toBeUndefined();
      expect(useThemeStore.getState().getResolvedTheme("char_4").primary).toBe(
        DEFAULT_THEME_TOKENS.primary,
      );
    });

    it("resets global theme to factory defaults", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("primary", "#EF4444");
      store.updateGlobalToken("radius", 30);

      store.resetGlobalTheme();
      const resetTheme = useThemeStore.getState().globalTheme;
      expect(resetTheme).toEqual(DEFAULT_THEME_TOKENS);
    });

    it("toggles and sets color mode between dark and light", () => {
      const store = useThemeStore.getState();
      expect(store.globalTheme.mode).toBe("dark");

      // Switch to light mode
      store.setColorMode("light");
      let current = useThemeStore.getState().getResolvedTheme();
      expect(current.mode).toBe("light");
      expect(current.canvas).toBe("#F6F7F9");
      expect(current.card).toBe("#FFFFFF");
      expect(current.textPrimary).toBe("#0F1015");

      // Toggle back to dark mode
      store.toggleColorMode();
      current = useThemeStore.getState().getResolvedTheme();
      expect(current.mode).toBe("dark");
      expect(current.canvas).toBe(DEFAULT_THEME_TOKENS.canvas);
      expect(current.card).toBe(DEFAULT_THEME_TOKENS.card);
      expect(current.textPrimary).toBe(DEFAULT_THEME_TOKENS.textPrimary);

      // Character-scoped mode toggle
      store.setColorMode("light", "char_emma");
      const emmaTheme = useThemeStore.getState().getResolvedTheme("char_emma");
      expect(emmaTheme.mode).toBe("light");
      expect(emmaTheme.canvas).toBe("#F6F7F9");
      // Global remains dark
      expect(useThemeStore.getState().globalTheme.mode).toBe("dark");
    });
  });
});
