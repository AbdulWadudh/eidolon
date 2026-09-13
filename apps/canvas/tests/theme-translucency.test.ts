import { beforeEach, describe, expect, it } from "bun:test";
import { DEFAULT_LIGHT_THEME_TOKENS, DEFAULT_THEME_TOKENS } from "@eidolon/tokens";
import { mockMemory } from "./support/mock-native";

const { useThemeStore, tokensToCssVars, flushThemePersistence } = await import(
  "../store/theme-store"
);
const { createDefaultPalettes, migrateCharacterOverrides, migratePalettes } = await import(
  "../store/theme-modes"
);
const { blurIntensity, isTranslucent, overlayAlpha, surfaceAlpha, withAlpha } = await import(
  "../lib/translucency"
);
const { appStorage } = await import("../store/storage");

const GLOBAL_THEME_KEY = "eidolon.theme.global";

describe("Translucency token", () => {
  beforeEach(() => {
    mockMemory.clear();
    appStorage.delete(GLOBAL_THEME_KEY);
    useThemeStore.setState({
      palettes: createDefaultPalettes(),
      characterThemes: {},
      activeCharacterId: null,
    });
  });

  describe("Defaults", () => {
    it("ships opaque in both palettes", () => {
      expect(DEFAULT_THEME_TOKENS.translucency).toBe(0);
      expect(DEFAULT_LIGHT_THEME_TOKENS.translucency).toBe(0);
      expect(useThemeStore.getState().getResolvedTheme().translucency).toBe(0);
    });

    it("is a shared token, so it survives a mode switch", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("translucency", 45);
      store.setColorMode("light");

      const resolved = useThemeStore.getState().getResolvedTheme();
      expect(resolved.mode).toBe("light");
      expect(resolved.translucency).toBe(45);
    });
  });

  describe("Migration of themes stored before the token existed", () => {
    it("backfills 0 on a stored palette that has no translucency", () => {
      const stored = {
        mode: "dark",
        dark: { canvas: "#000000", card: "#101010" },
        light: {},
        shared: { radius: 22, borderWidth: 2, fontScale: 1.25 },
      };

      const migrated = migratePalettes(stored);
      expect(migrated.shared.translucency).toBe(0);
      expect(migrated.shared.radius).toBe(22);
    });

    it("backfills 0 on a legacy flat token blob", () => {
      const migrated = migratePalettes({ mode: "dark", primary: "#06B6D4", radius: 14 });
      expect(migrated.shared.translucency).toBe(0);
      expect(migrated.shared.radius).toBe(14);
    });

    it("leaves character overrides without translucency inheriting from global", () => {
      const overrides = migrateCharacterOverrides({ shared: { radius: 18 } }, "dark");
      expect(overrides.shared?.translucency).toBeUndefined();

      useThemeStore.setState({ characterThemes: { char_1: overrides } });
      useThemeStore.getState().updateGlobalToken("translucency", 60);
      expect(useThemeStore.getState().getResolvedTheme("char_1").translucency).toBe(60);
    });

    it("a stored theme missing the key resolves opaque rather than undefined", () => {
      appStorage.set(
        GLOBAL_THEME_KEY,
        JSON.stringify({ mode: "dark", dark: {}, light: {}, shared: { radius: 10 } }),
      );
      const raw = appStorage.getString(GLOBAL_THEME_KEY);
      const restored = migratePalettes(JSON.parse(raw ?? "{}"));

      useThemeStore.setState({ palettes: restored });
      expect(useThemeStore.getState().getResolvedTheme().translucency).toBe(0);
    });
  });

  describe("Persistence and scoping", () => {
    it("writes translucency to storage so it survives a restart", () => {
      useThemeStore.getState().updateGlobalToken("translucency", 35);
      flushThemePersistence();

      const raw = appStorage.getString(GLOBAL_THEME_KEY);
      expect(typeof raw).toBe("string");
      const parsed = migratePalettes(JSON.parse(raw ?? "{}"));
      expect(parsed.shared.translucency).toBe(35);
    });

    it("supports a per-character override that shadows global", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("translucency", 20);
      store.updateCharacterToken("char_2", "translucency", 80);

      expect(store.getResolvedTheme().translucency).toBe(20);
      expect(store.getResolvedTheme("char_2").translucency).toBe(80);
    });

    it("resets to 0 globally and drops the override in character scope", () => {
      const store = useThemeStore.getState();
      store.updateGlobalToken("translucency", 50);
      store.updateCharacterToken("char_3", "translucency", 90);

      store.resetToken("translucency", "char_3");
      expect(useThemeStore.getState().getResolvedTheme("char_3").translucency).toBe(50);

      store.resetToken("translucency");
      expect(useThemeStore.getState().getResolvedTheme().translucency).toBe(0);
    });
  });

  describe("CSS variables", () => {
    it("emits opaque values at the default", () => {
      const cssVars = tokensToCssVars(DEFAULT_THEME_TOKENS);
      expect(cssVars["--translucency"]).toBe("0");
      expect(cssVars["--surface-alpha"]).toBe("1");
      expect(cssVars["--surface-blur"]).toBe("0px");
    });

    it("tracks the token as it rises", () => {
      const cssVars = tokensToCssVars({ ...DEFAULT_THEME_TOKENS, translucency: 80 });
      expect(cssVars["--translucency"]).toBe("80");
      expect(cssVars["--surface-alpha"]).toBe("0.4");
      expect(cssVars["--surface-blur"]).toBe("19px");
    });
  });

  describe("Derivation", () => {
    it("keeps surfaces fully opaque at 0 and partly tinted at 100", () => {
      expect(surfaceAlpha(0)).toBe(1);
      expect(surfaceAlpha(100)).toBe(0.25);
      expect(isTranslucent(0)).toBe(false);
      expect(isTranslucent(5)).toBe(true);
    });

    it("keeps overlay surfaces far denser than in-flow ones so sheets stay legible", () => {
      expect(overlayAlpha(0)).toBe(1);
      expect(overlayAlpha(100)).toBe(0.85);
      expect(overlayAlpha(50)).toBeGreaterThan(surfaceAlpha(50));
      expect(overlayAlpha(100)).toBeGreaterThan(surfaceAlpha(100));
    });

    it("clamps out-of-range and non-finite values", () => {
      expect(surfaceAlpha(-20)).toBe(1);
      expect(surfaceAlpha(400)).toBe(0.25);
      expect(surfaceAlpha(Number.NaN)).toBe(1);
      expect(blurIntensity(100)).toBe(80);
    });

    it("returns the colour untouched when fully opaque and rgba otherwise", () => {
      expect(withAlpha("#18191E", 1)).toBe("#18191E");
      expect(withAlpha("#18191E", 0.4)).toBe("rgba(24, 25, 30, 0.4)");
      expect(withAlpha("#FFF", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
      expect(withAlpha("transparent", 0.5)).toBe("transparent");
    });
  });
});
