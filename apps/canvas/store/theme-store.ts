import {
  DEFAULT_LIGHT_THEME_TOKENS,
  DEFAULT_THEME_TOKENS,
  type ThemeTokens,
} from "@eidolon/tokens";
import { create } from "zustand";
import { appStorage } from "./storage";

const STORAGE_KEYS = {
  GLOBAL_THEME: "eidolon.theme.global",
  CHARACTER_THEMES: "eidolon.theme.characters",
} as const;

export function tokensToCssVars(theme: ThemeTokens): Record<string, string> {
  const radiusPx = `${theme.radius}px`;
  const borderWidthPx = `${theme.borderWidth}px`;

  return {
    "--mode": theme.mode,
    "--color-scheme": theme.mode,
    "--canvas": theme.canvas,
    "--color-canvas": theme.canvas,
    "--card": theme.card,
    "--color-card": theme.card,
    "--card-border": theme.cardBorder,
    "--color-card-border": theme.cardBorder,
    "--border": theme.cardBorder,
    "--color-border": theme.cardBorder,
    "--input-surface": theme.inputSurface,
    "--color-input-surface": theme.inputSurface,
    "--input": theme.inputSurface,
    "--color-input": theme.inputSurface,
    "--audio-pill-bg": theme.audioPillBg,
    "--color-audio-pill-bg": theme.audioPillBg,
    "--audio-pill": theme.audioPillBg,
    "--color-audio-pill": theme.audioPillBg,
    "--text-primary": theme.textPrimary,
    "--color-text-primary": theme.textPrimary,
    "--text-muted": theme.textMuted,
    "--color-text-muted": theme.textMuted,
    "--primary": theme.primary,
    "--color-primary": theme.primary,
    "--primary-foreground": theme.primaryForeground,
    "--color-primary-foreground": theme.primaryForeground,
    "--secondary": theme.secondary,
    "--color-secondary": theme.secondary,
    "--secondary-foreground": theme.secondaryForeground,
    "--color-secondary-foreground": theme.secondaryForeground,
    "--success": theme.success,
    "--color-success": theme.success,
    "--warning": theme.warning,
    "--color-warning": theme.warning,
    "--danger": theme.danger,
    "--color-danger": theme.danger,
    "--radius": radiusPx,
    "--radius-card": radiusPx,
    "--radius-button": radiusPx,
    "--radius-input": radiusPx,
    "--border-width": borderWidthPx,
    "--font-main": theme.fontMain,
    "--font-ui": theme.fontUI,
  };
}

export interface ThemeStore {
  globalTheme: ThemeTokens;
  characterThemes: Record<string, Partial<ThemeTokens>>;
  activeCharacterId: string | null;

  // Computed Getters
  getResolvedTheme: (characterId?: string) => ThemeTokens;
  getDynamicCssVars: (characterId?: string) => Record<string, string>;

  // Actions
  setColorMode: (mode: "dark" | "light", characterId?: string) => void;
  toggleColorMode: (characterId?: string) => void;
  updateGlobalToken: <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => void;
  updateCharacterToken: <K extends keyof ThemeTokens>(
    characterId: string,
    key: K,
    value: ThemeTokens[K],
  ) => void;
  resetCharacterTheme: (characterId: string) => void;
  promoteCharacterToGlobal: (characterId: string) => void;
  resetGlobalTheme: () => void;
  setActiveCharacter: (characterId: string | null) => void;
}

function loadInitialGlobalTheme(): ThemeTokens {
  try {
    const raw = appStorage.getString(STORAGE_KEYS.GLOBAL_THEME);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_THEME_TOKENS, ...parsed };
    }
  } catch (err) {
    console.warn("Failed to load global theme from storage:", err);
  }
  return { ...DEFAULT_THEME_TOKENS };
}

function loadInitialCharacterThemes(): Record<string, Partial<ThemeTokens>> {
  try {
    const raw = appStorage.getString(STORAGE_KEYS.CHARACTER_THEMES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to load character themes from storage:", err);
  }
  return {};
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  globalTheme: loadInitialGlobalTheme(),
  characterThemes: loadInitialCharacterThemes(),
  activeCharacterId: null,

  getResolvedTheme: (characterId?: string) => {
    const state = get();
    const targetId = characterId ?? state.activeCharacterId ?? undefined;
    if (targetId && state.characterThemes[targetId]) {
      return {
        ...state.globalTheme,
        ...state.characterThemes[targetId],
      };
    }
    return state.globalTheme;
  },

  getDynamicCssVars: (characterId?: string) => {
    const theme = get().getResolvedTheme(characterId);
    return tokensToCssVars(theme);
  },

  setColorMode: (mode, characterId) => {
    const palette = mode === "light" ? DEFAULT_LIGHT_THEME_TOKENS : DEFAULT_THEME_TOKENS;
    const modeTokens: Partial<ThemeTokens> = {
      mode,
      canvas: palette.canvas,
      card: palette.card,
      cardBorder: palette.cardBorder,
      inputSurface: palette.inputSurface,
      audioPillBg: palette.audioPillBg,
      textPrimary: palette.textPrimary,
      textMuted: palette.textMuted,
      secondary: palette.secondary,
      secondaryForeground: palette.secondaryForeground,
    };

    if (characterId) {
      set((state) => {
        const existing = state.characterThemes[characterId] || {};
        const updatedOverrides = { ...existing, ...modeTokens };
        const updatedCharacterThemes = {
          ...state.characterThemes,
          [characterId]: updatedOverrides,
        };
        try {
          appStorage.set(STORAGE_KEYS.CHARACTER_THEMES, JSON.stringify(updatedCharacterThemes));
        } catch (err) {
          console.warn("Failed to persist character mode:", err);
        }
        return { characterThemes: updatedCharacterThemes };
      });
    } else {
      set((state) => {
        const updatedGlobal = { ...state.globalTheme, ...modeTokens };
        try {
          appStorage.set(STORAGE_KEYS.GLOBAL_THEME, JSON.stringify(updatedGlobal));
        } catch (err) {
          console.warn("Failed to persist global mode:", err);
        }
        return { globalTheme: updatedGlobal };
      });
    }
  },

  toggleColorMode: (characterId) => {
    const current = get().getResolvedTheme(characterId);
    const nextMode = current.mode === "light" ? "dark" : "light";
    get().setColorMode(nextMode, characterId);
  },

  updateGlobalToken: (key, value) => {
    set((state) => {
      const updatedGlobal = {
        ...state.globalTheme,
        [key]: value,
      };
      try {
        appStorage.set(STORAGE_KEYS.GLOBAL_THEME, JSON.stringify(updatedGlobal));
      } catch (err) {
        console.warn("Failed to persist global theme:", err);
      }
      return { globalTheme: updatedGlobal };
    });
  },

  updateCharacterToken: (characterId, key, value) => {
    set((state) => {
      const existing = state.characterThemes[characterId] || {};
      const updatedOverrides = {
        ...existing,
        [key]: value,
      };
      const updatedCharacterThemes = {
        ...state.characterThemes,
        [characterId]: updatedOverrides,
      };
      try {
        appStorage.set(STORAGE_KEYS.CHARACTER_THEMES, JSON.stringify(updatedCharacterThemes));
      } catch (err) {
        console.warn("Failed to persist character themes:", err);
      }
      return { characterThemes: updatedCharacterThemes };
    });
  },

  resetCharacterTheme: (characterId) => {
    set((state) => {
      const updatedCharacterThemes = { ...state.characterThemes };
      delete updatedCharacterThemes[characterId];
      try {
        appStorage.set(STORAGE_KEYS.CHARACTER_THEMES, JSON.stringify(updatedCharacterThemes));
      } catch (err) {
        console.warn("Failed to persist character themes after reset:", err);
      }
      return { characterThemes: updatedCharacterThemes };
    });
  },

  promoteCharacterToGlobal: (characterId) => {
    set((state) => {
      const resolved = {
        ...state.globalTheme,
        ...(state.characterThemes[characterId] || {}),
      };
      const updatedCharacterThemes = { ...state.characterThemes };
      delete updatedCharacterThemes[characterId];

      try {
        appStorage.set(STORAGE_KEYS.GLOBAL_THEME, JSON.stringify(resolved));
        appStorage.set(STORAGE_KEYS.CHARACTER_THEMES, JSON.stringify(updatedCharacterThemes));
      } catch (err) {
        console.warn("Failed to persist themes after promote:", err);
      }

      return {
        globalTheme: resolved,
        characterThemes: updatedCharacterThemes,
      };
    });
  },

  resetGlobalTheme: () => {
    set(() => {
      const reset = { ...DEFAULT_THEME_TOKENS };
      try {
        appStorage.set(STORAGE_KEYS.GLOBAL_THEME, JSON.stringify(reset));
      } catch (err) {
        console.warn("Failed to persist global theme reset:", err);
      }
      return { globalTheme: reset };
    });
  },

  setActiveCharacter: (characterId) => {
    set({ activeCharacterId: characterId });
  },
}));
