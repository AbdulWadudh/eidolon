import type { ThemeTokens } from "@eidolon/tokens";
import * as React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { ResetTokenButton } from "@/components/ui/reset-token-button";
import { CheckmarkCircle01Icon, ColorPickerIcon } from "@/lib/icons";

const COLOR_SWATCHES = [
  { name: "Amber", hex: "#F59E0B" },
  { name: "Ruby", hex: "#E11D48" },
  { name: "Jade", hex: "#10B981" },
  { name: "Lapis", hex: "#2563EB" },
  { name: "Amethyst", hex: "#8B5CF6" },
  { name: "Slate", hex: "#64748B" },
  { name: "Black", hex: "#000000" },
];

const HEX_PATTERN = /^#([0-9A-F]{3}|[0-9A-F]{6}|[0-9A-F]{8})$/;

interface ColorFieldProps {
  label: string;
  tokenKey: keyof ThemeTokens;
  pickerTitle: string;
  value: string;
  accentColor: string;
  borderColor: string;
  mutedColor: string;
  onChange: (tokenKey: keyof ThemeTokens, val: string) => void;
  onOpenPicker: (tokenKey: keyof ThemeTokens, title: string, current: string) => void;
  onReset: (tokenKey: keyof ThemeTokens) => void;
  isDefault: boolean;
}

export const ColorField = React.memo(function ColorField({
  label,
  tokenKey,
  pickerTitle,
  value,
  accentColor,
  borderColor,
  mutedColor,
  onChange,
  onOpenPicker,
  onReset,
  isDefault,
}: ColorFieldProps) {
  const [localHex, setLocalHex] = React.useState(value);

  React.useEffect(() => {
    setLocalHex((prev) => (prev.toUpperCase() === value.toUpperCase() ? prev : value));
  }, [value]);

  const handleHexChange = (text: string) => {
    let clean = text.trim().toUpperCase();
    if (!clean.startsWith("#") && clean.length > 0) {
      clean = `#${clean}`;
    }
    setLocalHex(clean);
    if (HEX_PATTERN.test(clean)) {
      onChange(tokenKey, clean);
    }
  };

  return (
    <View className="mb-3 rounded-button border border-border bg-input p-2.5">
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className="h-4 w-4 rounded-full border border-border"
            style={{ backgroundColor: value }}
          />
          <Text className="font-ui-medium text-xs text-text-primary">{label}</Text>
        </View>
        <Text className="font-ui text-[10px] text-text-muted">--{tokenKey}</Text>
      </View>

      {/* Swatches */}
      <View className="mb-2 flex-row flex-wrap gap-1.5">
        {COLOR_SWATCHES.map((swatch) => {
          const isSelected = value.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <Pressable
              key={swatch.hex}
              className="h-6 w-6 items-center justify-center rounded-full border"
              style={{
                backgroundColor: swatch.hex,
                borderColor: isSelected ? accentColor : borderColor,
                borderWidth: isSelected ? 2 : 1,
              }}
              onPress={() => onChange(tokenKey, swatch.hex)}
            >
              {isSelected && (
                <AppIcon
                  icon={CheckmarkCircle01Icon}
                  size={12}
                  color={swatch.hex === "#000000" ? "#FFFFFF" : "#000000"}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Direct Hex Input + Color Wheel Trigger */}
      <View className="flex-row items-center gap-2">
        <TextInput
          value={localHex}
          onChangeText={handleHexChange}
          placeholder="#HEX"
          placeholderTextColor={mutedColor}
          className="h-10 flex-1 rounded border border-border bg-card px-2 font-ui text-xs text-text-primary"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
          style={{ paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" }}
        />
        <Pressable
          className="h-8 w-8 items-center justify-center rounded border border-border active:opacity-75"
          style={{ backgroundColor: value }}
          onPress={() => onOpenPicker(tokenKey, pickerTitle, value)}
        >
          <AppIcon
            icon={ColorPickerIcon}
            size={14}
            color={value.toLowerCase() === "#ffffff" ? "#000000" : "#FFFFFF"}
          />
        </Pressable>
        <ResetTokenButton
          onPress={() => onReset(tokenKey)}
          isDefault={isDefault}
          color={mutedColor}
          accessibilityLabel={`Reset ${label} to default`}
          size={32}
        />
      </View>
    </View>
  );
});
