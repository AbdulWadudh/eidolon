export const TYPOGRAPHY = {
  fonts: {
    sans: "Plus Jakarta Sans",
    serif: "Fraunces",
    mono: "monospace",
  },
  weights: {
    dialogue: "700",
    narration: "italic",
    regular: "400",
    medium: "500",
    semiBold: "600",
    bold: "700",
  },
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export type Typography = typeof TYPOGRAPHY;
