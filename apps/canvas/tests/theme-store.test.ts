import { beforeEach, describe, expect, it } from "bun:test";
import { DEFAULT_THEME_TOKENS } from "@eidolon/tokens";
import { mockMemory } from "./support/mock-native";

const { useThemeStore, defaultTokenValue } = await import("../store/theme-store");
const { createDefaultPalettes, migratePalettes } = await import("../store/theme-modes");

/** The palette currently being edited. */
const activePalette = () => {
  const { palettes } = useThemeStore.getState();
  return palettes[palettes.mode];
};

describe("Theme store", () => {
  beforeEach(() => {
    mockMemory.clear();
    useThemeStore.getState().resetGlobalTheme();
    useThemeStore.setState({
      palettes: createDefaultPalettes(),
      characterThemes: {},
      activeCharacterId: null,
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

      expect(activePalette().canvas).toBe("#000000");
      expect(useThemeStore.getState().getResolvedTheme().canvas).toBe("#000000");
    });

    it("promotes character overrides to global default and clears overrides", () => {
      const store = useThemeStore.getState();
      store.updateCharacterToken("char_3", "primary", "#10B981");
      store.updateCharacterToken("char_3", "radius", 14);

      store.promoteCharacterToGlobal("char_3");

      const updated = useThemeStore.getState();
      expect(activePalette().primary).toBe("#10B981");
      expect(useThemeStore.getState().palettes.shared.radius).toBe(14);
      expect(updated.characterThemes.char_3).toBeUndefined();
    });

    it("resets character overrides back to global defaults", () => {
      const store = useThemeStore.getState();
      store.updateCharacterToken("char_4", "primary", "#8B5CF6");
      expect(useThemeStore.getState().characterThemes.char_4?.dark?.primary).toBe("#8B5CF6");

      store.resetCharacterTheme("char_4");
      expect(useThemeStore.getState().characterThemes.char_4).toBeUndefined();
      expect(useThemeStore.getState().getResolvedTheme("char_4").primary).toBe(
        DEFAULT_THEME_TOKENS.primary,
      );
    });

    it("resets a single global token to its factory value", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("primary", "#EC4899");
      store.updateGlobalToken("radius", 30);

      store.resetToken("primary");

      expect(activePalette().primary).toBe(DEFAULT_THEME_TOKENS.primary);
      // untouched tokens survive a single-token reset
      expect(useThemeStore.getState().palettes.shared.radius).toBe(30);
    });

    it("resets a single global token to the light palette while in light mode", () => {
      const store = useThemeStore.getState();
      store.setColorMode("light");
      useThemeStore.getState().updateGlobalToken("canvas", "#123456");

      useThemeStore.getState().resetToken("canvas");

      expect(activePalette().canvas).toBe(defaultTokenValue("canvas", "light"));
    });

    it("drops a character override so the token inherits global again", () => {
      const store = useThemeStore.getState();
      store.updateCharacterToken("char_5", "primary", "#8B5CF6");
      store.updateCharacterToken("char_5", "radius", 25);

      useThemeStore.getState().resetToken("primary", "char_5");

      const updated = useThemeStore.getState();
      expect(updated.characterThemes.char_5?.dark?.primary).toBeUndefined();
      expect(updated.characterThemes.char_5?.shared?.radius).toBe(25);
      expect(updated.getResolvedTheme("char_5").primary).toBe(DEFAULT_THEME_TOKENS.primary);
    });

    it("resets global theme to factory defaults", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("primary", "#EF4444");
      store.updateGlobalToken("radius", 30);

      store.resetGlobalTheme();
      // the resolved theme is the full token set; activePalette() is colours only
      expect(useThemeStore.getState().getResolvedTheme()).toEqual(DEFAULT_THEME_TOKENS);
    });
    it("shares geometry and typography across both modes", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("radius", 22);
      store.updateGlobalToken("fontMain", "serif");

      useThemeStore.getState().setColorMode("light");
      const light = useThemeStore.getState().getResolvedTheme();
      expect(light.radius).toBe(22);
      expect(light.fontMain).toBe("serif");

      // editing them in light mode changes them for dark too
      useThemeStore.getState().updateGlobalToken("radius", 4);
      useThemeStore.getState().setColorMode("dark");
      expect(useThemeStore.getState().getResolvedTheme().radius).toBe(4);
    });

    it("keeps the two palettes independent across a mode toggle", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("card", "#111111");

      useThemeStore.getState().setColorMode("light");
      // the light palette is untouched by the dark edit
      expect(activePalette().card).toBe("#FFFFFF");

      useThemeStore.getState().updateGlobalToken("card", "#EEEEEE");
      expect(activePalette().card).toBe("#EEEEEE");

      useThemeStore.getState().setColorMode("dark");
      expect(activePalette().card).toBe("#111111");

      useThemeStore.getState().setColorMode("light");
      expect(activePalette().card).toBe("#EEEEEE");
    });

    it("edits and resets only the active palette", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("primary", "#111111");
      useThemeStore.getState().setColorMode("light");
      useThemeStore.getState().updateGlobalToken("primary", "#222222");

      useThemeStore.getState().resetToken("primary");

      const { palettes } = useThemeStore.getState();
      expect(palettes.light.primary).toBe(DEFAULT_THEME_TOKENS.primary);
      expect(palettes.dark.primary).toBe("#111111");
    });

    it("keeps character overrides per mode", () => {
      const store = useThemeStore.getState();
      store.updateCharacterToken("char_m", "card", "#0A0A0A");

      useThemeStore.getState().setColorMode("light");
      // no light override yet, so the character inherits the light global
      expect(useThemeStore.getState().getResolvedTheme("char_m").card).toBe("#FFFFFF");

      useThemeStore.getState().updateCharacterToken("char_m", "card", "#FAFAFA");
      expect(useThemeStore.getState().getResolvedTheme("char_m").card).toBe("#FAFAFA");

      useThemeStore.getState().setColorMode("dark");
      expect(useThemeStore.getState().getResolvedTheme("char_m").card).toBe("#0A0A0A");
    });

    it("toggles between modes", () => {
      expect(useThemeStore.getState().palettes.mode).toBe("dark");

      useThemeStore.getState().toggleColorMode();
      expect(useThemeStore.getState().palettes.mode).toBe("light");
      expect(activePalette().canvas).toBe("#F6F7F9");

      useThemeStore.getState().toggleColorMode();
      expect(useThemeStore.getState().palettes.mode).toBe("dark");
      expect(activePalette().canvas).toBe(DEFAULT_THEME_TOKENS.canvas);
    });

    it("migrates a legacy flat theme into the mode it was authored in", () => {
      const migrated = migratePalettes({
        mode: "light",
        canvas: "#ABCDEF",
        primary: "#123456",
      });

      expect(migrated.mode).toBe("light");
      expect(migrated.light.canvas).toBe("#ABCDEF");
      expect(migrated.light.primary).toBe("#123456");
      // the untouched slot starts from the factory palette
      expect(migrated.dark.canvas).toBe(DEFAULT_THEME_TOKENS.canvas);
    });

    it("passes an already-migrated theme through unchanged", () => {
      const source = createDefaultPalettes("light");
      source.dark.card = "#010101";
      const migrated = migratePalettes(source);

      expect(migrated.mode).toBe("light");
      expect(migrated.dark.card).toBe("#010101");
    });
  });
});
