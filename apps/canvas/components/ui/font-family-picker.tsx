import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { FONT_PREVIEW_SAMPLE, FontPickerModal } from "@/components/ui/font-picker-modal";
import { ResetTokenButton } from "@/components/ui/reset-token-button";
import { ArrowDown01Icon } from "@/lib/icons";
import { FONT_FAMILY_PRESETS } from "@/lib/theme-presets";

export interface FontFamilyPickerProps {
  label: string;
  value: string;
  onSelect: (family: string) => void;
  onReset: () => void;
  isDefault: boolean;
  accentColor: string;
  mutedColor: string;
}

function displayNameFor(value: string): string {
  const preset = FONT_FAMILY_PRESETS.find((entry) => entry.family === value);
  if (preset) return preset.name;
  // Installed families are stored as "<Family>-Regular".
  return value.replace(/-Regular$/, "");
}

/**
 * One picker per font token. The theme carries both `fontMain` (dialogue) and
 * `fontUI` (interface chrome), and the bold/italic/medium variants are derived
 * from them, so exposing only one left half the type scale unreachable.
 *
 * Collapsed to a single row showing the current face rendered in itself, rather
 * than a stack of cards per family — with two slots on screen the list form cost
 * most of the section's height and still could not preview anything.
 */
export function FontFamilyPicker({
  label,
  value,
  onSelect,
  onReset,
  isDefault,
  accentColor,
  mutedColor,
}: FontFamilyPickerProps) {
  const [isPicking, setIsPicking] = React.useState(false);

  return (
    <View>
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="font-ui-bold text-[11px] uppercase tracking-wider text-text-muted">
          {label}
        </Text>
        <ResetTokenButton
          onPress={onReset}
          isDefault={isDefault}
          color={mutedColor}
          accessibilityLabel={`Reset ${label} to default`}
          size={26}
        />
      </View>

      <Pressable
        className="flex-row items-center justify-between rounded-button border border-border bg-input px-3 py-2.5 active:bg-border"
        onPress={() => setIsPicking(true)}
        accessibilityRole="button"
        accessibilityLabel={`Change ${label} font, currently ${displayNameFor(value)}`}
      >
        <View className="flex-1">
          <Text
            className="text-base text-text-primary"
            style={{ fontFamily: value }}
            numberOfLines={1}
          >
            {FONT_PREVIEW_SAMPLE}
          </Text>
          <Text className="font-ui text-[10px] text-text-muted">{displayNameFor(value)}</Text>
        </View>
        <AppIcon icon={ArrowDown01Icon} size={16} color={mutedColor} />
      </Pressable>

      {isPicking ? (
        <FontPickerModal
          isOpen
          onClose={() => setIsPicking(false)}
          slotLabel={label}
          currentValue={value}
          onApply={onSelect}
          accentColor={accentColor}
          mutedColor={mutedColor}
        />
      ) : null}
    </View>
  );
}
