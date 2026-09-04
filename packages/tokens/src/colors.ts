export const COLORS = {
  canvas: "#0D0E11",
  card: "#18191E",
  cardBorder: "#2A2C37",
  inputSurface: "#18191E",
  accentAmber: "#F59E0B",
  accentAmberHover: "#D97706",
  textPrimary: "#FFFFFF",
  textMuted: "#8E95A5",
  audioPillBg: "#111215",
  success: "#10B981",
  danger: "#EF4444",
} as const;

export type ColorKey = keyof typeof COLORS;
export type ColorValue = (typeof COLORS)[ColorKey];
