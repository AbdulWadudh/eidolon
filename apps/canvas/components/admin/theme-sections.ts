import { THEME_COPY } from "@eidolon/config";
import type { ThemeTokens } from "@eidolon/tokens";

export interface ColourSpec {
  token: keyof ThemeTokens;
  label: string;
}

export interface ColourSection {
  key: string;
  title: string;
  colours: ColourSpec[];
}

export const COLOUR_SECTIONS: ColourSection[] = [
  {
    key: "surfaces",
    title: THEME_COPY.background,
    colours: [
      { token: "canvas", label: THEME_COPY.background },
      { token: "card", label: THEME_COPY.cards },
      { token: "cardBorder", label: THEME_COPY.cardEdges },
      { token: "inputSurface", label: "Fields" },
      { token: "audioPillBg", label: "Voice notes" },
    ],
  },
  {
    key: "brand",
    title: THEME_COPY.accent,
    colours: [
      { token: "primary", label: THEME_COPY.accent },
      { token: "primaryForeground", label: THEME_COPY.textOnAccent },
      { token: "secondary", label: THEME_COPY.quietButtons },
      { token: "secondaryForeground", label: THEME_COPY.textOnQuietButtons },
    ],
  },
  {
    key: "text",
    title: THEME_COPY.type,
    colours: [
      { token: "textPrimary", label: "Body text" },
      { token: "textMuted", label: "Quiet text" },
    ],
  },
  {
    key: "semantic",
    title: THEME_COPY.success,
    colours: [
      { token: "success", label: THEME_COPY.success },
      { token: "warning", label: THEME_COPY.caution },
      { token: "danger", label: THEME_COPY.danger },
    ],
  },
];

export interface NumberSpec {
  token: keyof ThemeTokens;
  label: string;
  min: number;
  max: number;
  step: number;
}

export const NUMBER_TOKENS: NumberSpec[] = [
  { token: "radius", label: THEME_COPY.corners, min: 0, max: 40, step: 1 },
  { token: "borderWidth", label: THEME_COPY.cardEdges, min: 0, max: 4, step: 1 },
  { token: "translucency", label: THEME_COPY.glass, min: 0, max: 1, step: 0.05 },
];

export const FONT_TOKENS: ColourSpec[] = [
  { token: "fontMain", label: THEME_COPY.dialogue },
  { token: "fontUI", label: THEME_COPY.interface },
];
