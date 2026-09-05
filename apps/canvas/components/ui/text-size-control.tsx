import { Pressable, Text, View } from "react-native";
import { RangeSlider } from "@/components/ui/range-slider";
import { ResetTokenButton } from "@/components/ui/reset-token-button";

/** Percent steps, kept in sync with the slider bounds below. */
const SCALE_PRESETS = [
  { label: "S", scale: 0.9 },
  { label: "M", scale: 1 },
  { label: "L", scale: 1.15 },
  { label: "XL", scale: 1.3 },
];

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;

export interface TextSizeControlProps {
  value: number;
  onChange: (scale: number) => void;
  onReset: () => void;
  isDefault: boolean;
  accentColor: string;
  mutedColor: string;
}

/**
 * Scales the whole type scale by publishing explicit `--text-*` pixel values
 * (see tokensToCssVars). The slider works in whole percent so it can reuse the
 * integer RangeSlider without introducing float drift.
 */
export function TextSizeControl({
  value,
  onChange,
  onReset,
  isDefault,
  accentColor,
  mutedColor,
}: TextSizeControlProps) {
  const percent = Math.round(value * 100);

  return (
    <View>
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="font-ui-bold text-[11px] uppercase tracking-wider text-text-muted">
          Text Size
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="font-ui-bold text-[11px] text-primary">{percent}%</Text>
          <ResetTokenButton
            onPress={onReset}
            isDefault={isDefault}
            color={mutedColor}
            accessibilityLabel="Reset text size to default"
            size={26}
          />
        </View>
      </View>

      <RangeSlider
        value={percent}
        min={Math.round(MIN_SCALE * 100)}
        max={Math.round(MAX_SCALE * 100)}
        step={5}
        accentColor={accentColor}
        onChange={(next) => onChange(next / 100)}
      />

      <View className="mt-2 flex-row gap-1.5">
        {SCALE_PRESETS.map((preset) => {
          const isSelected = Math.round(preset.scale * 100) === percent;
          return (
            <Pressable
              key={preset.label}
              className={`flex-1 items-center rounded-button border py-1.5 ${
                isSelected ? "border-primary bg-input" : "border-border bg-input"
              }`}
              onPress={() => onChange(preset.scale)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                className={`font-ui text-xs ${
                  isSelected ? "font-bold text-primary" : "text-text-muted"
                }`}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
