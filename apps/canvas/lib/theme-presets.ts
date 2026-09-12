import { Moon02Icon, Sun02Icon } from "@/lib/icons";

export const MODES = [
  { mode: "dark", label: "Dark", icon: Moon02Icon },
  { mode: "light", label: "Light", icon: Sun02Icon },
] as const;

export interface FontFamilyPreset {
  name: string;
  family: string;
}

export const FONT_FAMILY_PRESETS: FontFamilyPreset[] = [
  { name: "Nunito Sans (Default)", family: "NunitoSans-Regular" },
  { name: "Public Sans (Technical)", family: "PublicSans-Regular" },
  { name: "System Serif (Literary)", family: "serif" },
  { name: "Monospace (Terminal)", family: "monospace" },
];
