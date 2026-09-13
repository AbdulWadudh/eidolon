import { beforeEach, describe, expect, it } from "bun:test";
import { mockMemory } from "./support/mock-native";

const { useThemeStore } = await import("../store/theme-store");
const { createDefaultPalettes } = await import("../store/theme-modes");

const store = () => useThemeStore.getState();

beforeEach(() => {
  mockMemory.clear();
  useThemeStore.setState({
    palettes: createDefaultPalettes("dark"),
    characterThemes: {},
    activeCharacterId: null,
  });
});

describe("a character's light or dark is its own", () => {
  it("leaves the rest of the app alone when one character is switched", () => {
    store().setCharacterColorMode("emma", "light");

    expect(store().getResolvedTheme("emma").mode).toBe("light");
    expect(store().getResolvedTheme("charline").mode).toBe("dark");
    expect(store().getResolvedTheme().mode).toBe("dark");
    expect(store().palettes.mode).toBe("dark");
  });

  it("keeps two characters apart from each other", () => {
    store().setCharacterColorMode("emma", "light");
    store().setCharacterColorMode("charline", "dark");

    expect(store().getResolvedTheme("emma").mode).toBe("light");
    expect(store().getResolvedTheme("charline").mode).toBe("dark");
  });

  it("follows the global mode until the character is given one of its own", () => {
    expect(store().getResolvedTheme("emma").mode).toBe("dark");

    store().setColorMode("light");
    expect(store().getResolvedTheme("emma").mode).toBe("light");

    store().setCharacterColorMode("emma", "dark");
    store().setColorMode("light");
    expect(store().getResolvedTheme("emma").mode).toBe("dark");
  });

  it("forgets its own mode when the character's theme is reset", () => {
    store().setCharacterColorMode("emma", "light");
    store().resetCharacterTheme("emma");

    expect(store().getResolvedTheme("emma").mode).toBe("dark");
  });

  it("takes the character's colours from the mode the character is in", () => {
    store().setCharacterColorMode("emma", "light");
    store().updateCharacterToken("emma", "primary", "#ff0000");

    expect(store().getResolvedTheme("emma").primary).toBe("#ff0000");
    expect(store().getResolvedTheme("charline").primary).not.toBe("#ff0000");

    store().setCharacterColorMode("emma", "dark");
    expect(store().getResolvedTheme("emma").primary).not.toBe("#ff0000");
  });

  it("carries the mode up when a character's theme is made the global one", () => {
    store().setCharacterColorMode("emma", "light");
    store().promoteCharacterToGlobal("emma");

    expect(store().palettes.mode).toBe("light");
    expect(store().characterThemes.emma).toBeUndefined();
  });
});
