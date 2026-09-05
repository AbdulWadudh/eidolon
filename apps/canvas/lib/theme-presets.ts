/**
 * Shared control presets, so the Theme Studio sheet and the Theme & Font Lab
 * screen stay in sync instead of each carrying its own copy.
 */
import { Moon02Icon, Sun02Icon } from "@/lib/icons";

export const MODES = [
  { mode: "dark", label: "Dark", icon: Moon02Icon },
  { mode: "light", label: "Light", icon: Sun02Icon },
] as const;

export interface FontFamilyPreset {
  name: string;
  /** Registered family name; variants are derived from it by the theme store. */
  family: string;
}

export const FONT_FAMILY_PRESETS: FontFamilyPreset[] = [
  { name: "Nunito Sans (Default)", family: "NunitoSans-Regular" },
  { name: "Public Sans (Technical)", family: "PublicSans-Regular" },
  { name: "System Serif (Literary)", family: "serif" },
  { name: "Monospace (Terminal)", family: "monospace" },
];
