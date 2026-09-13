import { UI_MS } from "@eidolon/config";
import type { ThemeTokens } from "@eidolon/tokens";
import { create } from "zustand";
import { appStorage } from "./storage";
import { tokensToCssVars } from "./theme-css-vars";
import {
  type CharacterOverrides,
  composeTheme,
  createDefaultPalettes,
  defaultColors,
  defaultShared,
  defaultTokenValue,
  isSharedToken,
  migrateCharacterOverrides,
  migratePalettes,
  type ThemeMode,
  type ThemePalettes,
} from "./theme-modes";

export { tokensToCssVars } from "./theme-css-vars";
export type { CharacterOverrides, ThemeMode, ThemePalettes } from "./theme-modes";
export { defaultTokenValue, isSharedToken, paletteFor } from "./theme-modes";

const STORAGE_KEYS = {
  GLOBAL_THEME: "eidolon.theme.global",
  CHARACTER_THEMES: "eidolon.theme.characters",
} as const;

const pendingWrites = new Map<string, string>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function flushThemePersistence(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (pendingWrites.size === 0) return;
  for (const [key, value] of pendingWrites) {
    try {
      appStorage.set(key, value);
    } catch (err) {
      console.warn(`Failed to persist ${key}:`, err);
    }
  }
  pendingWrites.clear();
}

function schedulePersist(key: string, value: unknown): void {
  try {
    pendingWrites.set(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to serialize ${key}:`, err);
    return;
  }
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushThemePersistence();
  }, UI_MS.themePersistDebounce);
}

const resolvedCache = new WeakMap<ThemePalettes, WeakMap<object, ThemeTokens>>();
const cssVarsCache = new WeakMap<ThemeTokens, Record<string, string>>();
const NO_OVERRIDES = Object.freeze({});

function resolveTheme(
  palettes: ThemePalettes,
  overrides: CharacterOverrides | undefined,
): ThemeTokens {
  const key = overrides ?? NO_OVERRIDES;
  let byOverride = resolvedCache.get(palettes);
  if (!byOverride) {
    byOverride = new WeakMap();
    resolvedCache.set(palettes, byOverride);
  }
  const cached = byOverride.get(key);
  if (cached) return cached;

  const mode = overrides?.mode ?? palettes.mode;
  const base = composeTheme(palettes, mode);
  const merged: ThemeTokens = overrides
    ? { ...base, ...overrides[mode], ...overrides.shared }
    : base;
  byOverride.set(key, merged);
  return merged;
}

function cssVarsFor(theme: ThemeTokens): Record<string, string> {
  const cached = cssVarsCache.get(theme);
  if (cached) return cached;
  const cssVars = tokensToCssVars(theme);
  cssVarsCache.set(theme, cssVars);
  return cssVars;
}

export interface ThemeStore {
  palettes: ThemePalettes;
  characterThemes: Record<string, CharacterOverrides>;
  activeCharacterId: string | null;

  getResolvedTheme: (characterId?: string) => ThemeTokens;
  getDynamicCssVars: (characterId?: string) => Record<string, string>;

  setColorMode: (mode: ThemeMode) => void;
  setCharacterColorMode: (characterId: string, mode: ThemeMode) => void;
  characterColorMode: (characterId: string) => ThemeMode;
  toggleColorMode: () => void;
  updateGlobalToken: <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => void;
  updateCharacterToken: <K extends keyof ThemeTokens>(
    characterId: string,
    key: K,
    value: ThemeTokens[K],
  ) => void;
  resetToken: <K extends keyof ThemeTokens>(key: K, characterId?: string) => void;
  resetCharacterTheme: (characterId: string) => void;
  promoteCharacterToGlobal: (characterId: string) => void;
  resetGlobalTheme: () => void;
  setActiveCharacter: (characterId: string | null) => void;
}

function loadPalettes(): ThemePalettes {
  try {
    const raw = appStorage.getString(STORAGE_KEYS.GLOBAL_THEME);
    if (raw) return migratePalettes(JSON.parse(raw));
  } catch (err) {
    console.warn("Failed to load theme from storage:", err);
  }
  return createDefaultPalettes();
}

function loadCharacterThemes(mode: ThemeMode): Record<string, CharacterOverrides> {
  try {
    const raw = appStorage.getString(STORAGE_KEYS.CHARACTER_THEMES);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([id, value]) => [id, migrateCharacterOverrides(value, mode)]),
    );
  } catch (err) {
    console.warn("Failed to load character themes from storage:", err);
    return {};
  }
}

const initialPalettes = loadPalettes();

export const useThemeStore = create<ThemeStore>((set, get) => ({
  palettes: initialPalettes,
  characterThemes: loadCharacterThemes(initialPalettes.mode),
  activeCharacterId: null,

  getResolvedTheme: (characterId?: string) => {
    const state = get();
    const targetId = characterId ?? state.activeCharacterId ?? undefined;
    return resolveTheme(state.palettes, targetId ? state.characterThemes[targetId] : undefined);
  },

  getDynamicCssVars: (characterId?: string) => cssVarsFor(get().getResolvedTheme(characterId)),

  setColorMode: (mode) => {
    set((state) => {
      if (state.palettes.mode === mode) return state;
      const palettes = { ...state.palettes, mode };
      schedulePersist(STORAGE_KEYS.GLOBAL_THEME, palettes);
      return { palettes };
    });
  },

  toggleColorMode: () => {
    get().setColorMode(get().palettes.mode === "light" ? "dark" : "light");
  },

  characterColorMode: (characterId) => {
    const state = get();
    return state.characterThemes[characterId]?.mode ?? state.palettes.mode;
  },

  setCharacterColorMode: (characterId, mode) => {
    set((state) => {
      const existing = state.characterThemes[characterId] ?? {};
      if ((existing.mode ?? state.palettes.mode) === mode) return state;

      const characterThemes = {
        ...state.characterThemes,
        [characterId]: { ...existing, mode },
      };
      schedulePersist(STORAGE_KEYS.CHARACTER_THEMES, characterThemes);
      return { characterThemes };
    });
  },

  updateGlobalToken: (key, value) => {
    set((state) => {
      const slot: "shared" | ThemeMode = isSharedToken(key) ? "shared" : state.palettes.mode;
      const current = state.palettes[slot] as Partial<ThemeTokens>;
      if (current[key] === value) return state;
      const palettes = { ...state.palettes, [slot]: { ...current, [key]: value } };
      schedulePersist(STORAGE_KEYS.GLOBAL_THEME, palettes);
      return { palettes };
    });
  },

  updateCharacterToken: (characterId, key, value) => {
    set((state) => {
      const existing = state.characterThemes[characterId] ?? {};
      const mode = existing.mode ?? state.palettes.mode;
      const slot: "shared" | ThemeMode = isSharedToken(key) ? "shared" : mode;
      const current = (existing[slot] ?? {}) as Partial<ThemeTokens>;
      if (current[key] === value) return state;
      const characterThemes = {
        ...state.characterThemes,
        [characterId]: { ...existing, [slot]: { ...current, [key]: value } },
      };
      schedulePersist(STORAGE_KEYS.CHARACTER_THEMES, characterThemes);
      return { characterThemes };
    });
  },

  resetToken: (key, characterId) => {
    if (characterId) {
      set((state) => {
        const existing = state.characterThemes[characterId];
        const mode = existing?.mode ?? state.palettes.mode;
        const slot: "shared" | ThemeMode = isSharedToken(key) ? "shared" : mode;
        const slotOverrides = existing?.[slot] as Partial<ThemeTokens> | undefined;
        if (!slotOverrides || !(key in slotOverrides)) return state;
        const updated = { ...slotOverrides };
        delete updated[key];
        const characterThemes = {
          ...state.characterThemes,
          [characterId]: { ...existing, [slot]: updated },
        };
        schedulePersist(STORAGE_KEYS.CHARACTER_THEMES, characterThemes);
        return { characterThemes };
      });
      return;
    }

    set((state) => {
      const slot: "shared" | ThemeMode = isSharedToken(key) ? "shared" : state.palettes.mode;
      const fallback = defaultTokenValue(key, state.palettes.mode);
      const current = state.palettes[slot] as Partial<ThemeTokens>;
      if (current[key] === fallback) return state;
      const palettes = { ...state.palettes, [slot]: { ...current, [key]: fallback } };
      schedulePersist(STORAGE_KEYS.GLOBAL_THEME, palettes);
      return { palettes };
    });
  },

  resetCharacterTheme: (characterId) => {
    set((state) => {
      if (!(characterId in state.characterThemes)) return state;
      const characterThemes = { ...state.characterThemes };
      delete characterThemes[characterId];
      schedulePersist(STORAGE_KEYS.CHARACTER_THEMES, characterThemes);
      return { characterThemes };
    });
  },

  promoteCharacterToGlobal: (characterId) => {
    set((state) => {
      const overrides = state.characterThemes[characterId] ?? {};
      const palettes: ThemePalettes = {
        ...state.palettes,
        mode: overrides.mode ?? state.palettes.mode,
        dark: { ...state.palettes.dark, ...overrides.dark },
        light: { ...state.palettes.light, ...overrides.light },
        shared: { ...state.palettes.shared, ...overrides.shared },
      };
      const characterThemes = { ...state.characterThemes };
      delete characterThemes[characterId];

      schedulePersist(STORAGE_KEYS.GLOBAL_THEME, palettes);
      schedulePersist(STORAGE_KEYS.CHARACTER_THEMES, characterThemes);
      return { palettes, characterThemes };
    });
  },

  resetGlobalTheme: () => {
    set((state) => {
      const { mode } = state.palettes;
      const palettes: ThemePalettes = {
        ...state.palettes,
        [mode]: defaultColors(mode),
        shared: defaultShared(),
      };
      schedulePersist(STORAGE_KEYS.GLOBAL_THEME, palettes);
      return { palettes };
    });
  },

  setActiveCharacter: (characterId) => {
    set((state) =>
      state.activeCharacterId === characterId ? state : { activeCharacterId: characterId },
    );
  },
}));

const selectPalettes = (state: ThemeStore) => state.palettes;
const selectActiveCharacterId = (state: ThemeStore) => state.activeCharacterId;

export function useResolvedTheme(characterId?: string): ThemeTokens {
  const palettes = useThemeStore(selectPalettes);
  const activeCharacterId = useThemeStore(selectActiveCharacterId);
  const targetId = characterId ?? activeCharacterId ?? undefined;
  const overrides = useThemeStore((state) =>
    targetId ? state.characterThemes[targetId] : undefined,
  );
  return resolveTheme(palettes, overrides);
}

export function useThemeCssVars(characterId?: string): Record<string, string> {
  return cssVarsFor(useResolvedTheme(characterId));
}
