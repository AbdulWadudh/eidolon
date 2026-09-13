import type { AdminThemeView, ThemeTokenPatch } from "@eidolon/protocol";
import {
  DEFAULT_LIGHT_THEME_TOKENS,
  DEFAULT_THEME_TOKENS,
  type ThemeTokens,
} from "@eidolon/tokens";
import {
  overridesUnder,
  removeOverride,
  removeOverridesUnder,
  writeOverride,
} from "@/db/overrides";

export const THEME_PREFIX = "theme.";

export const THEME_TOKEN_KEYS = Object.keys(DEFAULT_THEME_TOKENS) as (keyof ThemeTokens)[];

export function isThemeToken(key: string): key is keyof ThemeTokens {
  return THEME_TOKEN_KEYS.some((token) => token === key);
}

export function themePath(token: keyof ThemeTokens): string {
  return `${THEME_PREFIX}${token}`;
}

export function readThemeOverrides(): ThemeTokenPatch {
  const patch: Record<string, unknown> = {};

  for (const entry of overridesUnder(THEME_PREFIX)) {
    const token = entry.path.slice(THEME_PREFIX.length);
    if (isThemeToken(token)) patch[token] = entry.value;
  }

  return patch as ThemeTokenPatch;
}

export function defaultsForMode(mode: ThemeTokens["mode"]): ThemeTokens {
  return mode === "light" ? DEFAULT_LIGHT_THEME_TOKENS : DEFAULT_THEME_TOKENS;
}

export function resolveTheme(): ThemeTokens {
  const overrides = readThemeOverrides();
  return { ...defaultsForMode(overrides.mode ?? DEFAULT_THEME_TOKENS.mode), ...overrides };
}

export function buildThemeView(): AdminThemeView {
  const overrides = readThemeOverrides();

  return {
    tokens: resolveTheme(),
    defaults: defaultsForMode(overrides.mode ?? DEFAULT_THEME_TOKENS.mode),
    overrides,
  };
}

export function applyThemePatch(patch: ThemeTokenPatch): AdminThemeView {
  for (const [token, value] of Object.entries(patch)) {
    if (!isThemeToken(token) || value === undefined) continue;
    writeOverride(themePath(token), value);
  }

  return buildThemeView();
}

export function resetThemeToken(token: keyof ThemeTokens): boolean {
  return removeOverride(themePath(token));
}

export function resetTheme(): number {
  return removeOverridesUnder(THEME_PREFIX);
}
