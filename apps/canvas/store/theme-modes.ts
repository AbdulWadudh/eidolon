import {
  DEFAULT_LIGHT_THEME_TOKENS,
  DEFAULT_THEME_TOKENS,
  type ThemeTokens,
} from "@eidolon/tokens";

export type ThemeMode = ThemeTokens["mode"];

export const COLOR_TOKEN_KEYS = [
  "canvas",
  "card",
  "cardBorder",
  "inputSurface",
  "audioPillBg",
  "textPrimary",
  "textMuted",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "success",
  "warning",
  "danger",
] as const satisfies readonly (keyof ThemeTokens)[];

export const SHARED_TOKEN_KEYS = [
  "radius",
  "borderWidth",
  "fontMain",
  "fontUI",
  "fontScale",
] as const satisfies readonly (keyof ThemeTokens)[];

export type ColorTokens = Pick<ThemeTokens, (typeof COLOR_TOKEN_KEYS)[number]>;
export type SharedTokens = Pick<ThemeTokens, (typeof SHARED_TOKEN_KEYS)[number]>;

export function isSharedToken(key: keyof ThemeTokens): boolean {
  return (SHARED_TOKEN_KEYS as readonly string[]).includes(key);
}

export interface ThemePalettes {
  mode: ThemeMode;
  dark: ColorTokens;
  light: ColorTokens;
  shared: SharedTokens;
}

export interface CharacterOverrides {
  dark?: Partial<ColorTokens>;
  light?: Partial<ColorTokens>;
  shared?: Partial<SharedTokens>;
}

function pick<K extends readonly (keyof ThemeTokens)[]>(
  source: Partial<ThemeTokens>,
  keys: K,
): Pick<ThemeTokens, K[number]> {
  const result = {} as Pick<ThemeTokens, K[number]>;
  for (const key of keys) {
    if (source[key] !== undefined) {
      result[key as K[number]] = source[key] as ThemeTokens[K[number]];
    }
  }
  return result;
}

export function paletteFor(mode: ThemeMode): ThemeTokens {
  return mode === "light" ? DEFAULT_LIGHT_THEME_TOKENS : DEFAULT_THEME_TOKENS;
}

export function defaultColors(mode: ThemeMode): ColorTokens {
  return pick(paletteFor(mode), COLOR_TOKEN_KEYS);
}

export function defaultShared(): SharedTokens {
  return pick(DEFAULT_THEME_TOKENS, SHARED_TOKEN_KEYS);
}

export function defaultTokenValue<K extends keyof ThemeTokens>(
  key: K,
  mode: ThemeMode,
): ThemeTokens[K] {
  return isSharedToken(key) ? DEFAULT_THEME_TOKENS[key] : paletteFor(mode)[key];
}

export function createDefaultPalettes(mode: ThemeMode = "dark"): ThemePalettes {
  return {
    mode,
    dark: defaultColors("dark"),
    light: defaultColors("light"),
    shared: defaultShared(),
  };
}

export function composeTheme(
  palettes: ThemePalettes,
  mode: ThemeMode = palettes.mode,
): ThemeTokens {
  return { ...paletteFor(mode), ...palettes[mode], ...palettes.shared, mode };
}

function isPalettes(value: unknown): value is ThemePalettes {
  return Boolean(value && typeof value === "object" && "dark" in value && "light" in value);
}

export function migratePalettes(raw: unknown): ThemePalettes {
  if (isPalettes(raw)) {
    const value = raw as Partial<ThemePalettes>;
    return {
      mode: value.mode === "light" ? "light" : "dark",
      dark: { ...defaultColors("dark"), ...value.dark },
      light: { ...defaultColors("light"), ...value.light },
      shared: { ...defaultShared(), ...value.shared },
    };
  }

  const legacy = (raw ?? {}) as Partial<ThemeTokens>;
  const mode: ThemeMode = legacy.mode === "light" ? "light" : "dark";
  const palettes = createDefaultPalettes(mode);
  palettes[mode] = { ...palettes[mode], ...pick(legacy, COLOR_TOKEN_KEYS) };
  palettes.shared = { ...palettes.shared, ...pick(legacy, SHARED_TOKEN_KEYS) };
  return palettes;
}

export function migrateCharacterOverrides(raw: unknown, mode: ThemeMode): CharacterOverrides {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as CharacterOverrides & Partial<ThemeTokens>;
  if ("dark" in value || "light" in value || "shared" in value) {
    return { dark: value.dark, light: value.light, shared: value.shared };
  }

  const colors = pick(value, COLOR_TOKEN_KEYS);
  const shared = pick(value, SHARED_TOKEN_KEYS);
  const result: CharacterOverrides = {};
  if (Object.keys(colors).length > 0) result[mode] = colors;
  if (Object.keys(shared).length > 0) result.shared = shared;
  return result;
}
