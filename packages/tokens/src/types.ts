export interface ThemeTokens {
  mode: "dark" | "light";

  canvas: string;
  card: string;
  cardBorder: string;
  inputSurface: string;
  audioPillBg: string;

  textPrimary: string;
  textMuted: string;

  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;

  success: string;
  warning: string;
  danger: string;

  radius: number;
  borderWidth: number;
  translucency: number;

  fontMain: string;
  fontUI: string;
  fontScale: number;
}

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  mode: "dark",
  canvas: "#0D0E11",
  card: "#18191E",
  cardBorder: "#2A2C37",
  inputSurface: "#18191E",
  audioPillBg: "#111215",
  textPrimary: "#FFFFFF",
  textMuted: "#8E95A5",
  primary: "#F59E0B",
  primaryForeground: "#000000",
  secondary: "#242630",
  secondaryForeground: "#FFFFFF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  radius: 10,
  borderWidth: 1,
  translucency: 0,
  fontMain: "NunitoSans-Regular",
  fontUI: "PublicSans-Regular",
  fontScale: 1,
};

export const DEFAULT_LIGHT_THEME_TOKENS: ThemeTokens = {
  mode: "light",
  canvas: "#F6F7F9",
  card: "#FFFFFF",
  cardBorder: "#E2E4E9",
  inputSurface: "#FFFFFF",
  audioPillBg: "#ECEFF2",
  textPrimary: "#0F1015",
  textMuted: "#6B7280",
  primary: "#F59E0B",
  primaryForeground: "#000000",
  secondary: "#F1F3F5",
  secondaryForeground: "#161821",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  radius: 10,
  borderWidth: 1,
  translucency: 0,
  fontMain: "NunitoSans-Regular",
  fontUI: "PublicSans-Regular",
  fontScale: 1,
};
