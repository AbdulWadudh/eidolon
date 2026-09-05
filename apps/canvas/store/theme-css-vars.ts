import type { ThemeTokens } from "@eidolon/tokens";

/**
 * Derives a sibling family name, e.g. NunitoSans-Regular -> NunitoSans-Bold.
 *
 * The theme only stores `fontMain`/`fontUI`, but the utilities in global.css also
 * read --font-main-bold, --font-main-italic, --font-ui-medium and --font-ui-bold.
 * Those were never emitted, so they always resolved to the :root defaults and
 * every `font-*-bold` element kept the original font after a font switch.
 *
 * Platform families ("serif", "monospace", "System") have no variant suffix, so
 * they are returned unchanged and the platform synthesises the weight.
 */
function fontVariant(base: string, variant: "Bold" | "Italic" | "Medium"): string {
  const separator = base.lastIndexOf("-");
  if (separator <= 0) return base;
  return `${base.slice(0, separator)}-${variant}`;
}

/**
 * Tailwind's text sizes are rem-based and react-native-css resolves rem against
 * a single `__rn-css-rem` variable (default 14). Scaling that would resize
 * spacing too, since --spacing is also rem-based, so the type scale is published
 * as explicit pixel values instead. These bases are the current computed sizes
 * at rem 14, so a scale of 1 renders exactly as before.
 */
const TEXT_SCALE_BASE_PX = {
  "--text-xs": 10.5,
  "--text-sm": 12.25,
  "--text-base": 14,
  "--text-lg": 15.75,
  "--text-xl": 17.5,
  "--text-2xl": 21,
} as const;

function scaledTextSizes(scale: number): Record<string, string> {
  const sizes: Record<string, string> = {};
  for (const [name, base] of Object.entries(TEXT_SCALE_BASE_PX)) {
    sizes[name] = `${Math.round(base * scale * 100) / 100}px`;
  }
  return sizes;
}

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
    "--font-main-bold": fontVariant(theme.fontMain, "Bold"),
    "--font-main-italic": fontVariant(theme.fontMain, "Italic"),
    "--font-ui": theme.fontUI,
    "--font-ui-medium": fontVariant(theme.fontUI, "Medium"),
    "--font-ui-bold": fontVariant(theme.fontUI, "Bold"),
    "--font-scale": String(theme.fontScale),
    ...scaledTextSizes(theme.fontScale),
  };
}
