import { THEME_COPY } from "@eidolon/config";
import { Pressable, Text, View } from "react-native";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { RangeSlider } from "@/components/ui/range-slider";
import { ResetTokenButton } from "@/components/ui/reset-token-button";

export const TRANSLUCENCY_SECTION_KEY = "translucency";

const TRANSLUCENCY_PRESETS = [0, 25, 50, 80];

function presetLabel(value: number): string {
  return value === 0 ? THEME_COPY.glassOff : `${value}%`;
}

export interface TranslucencySectionProps {
  value: number;
  isDefault: boolean;
  expanded: boolean;
  accentColor: string;
  chevronColor: string;
  onToggle: (sectionKey: string) => void;
  onChange: (value: number) => void;
  onReset: () => void;
}

export function TranslucencySection({
  value,
  isDefault,
  expanded,
  accentColor,
  chevronColor,
  onToggle,
  onChange,
  onReset,
}: TranslucencySectionProps) {
  return (
    <CollapsibleSection
      sectionKey={TRANSLUCENCY_SECTION_KEY}
      title={THEME_COPY.glass}
      action={
        <ResetTokenButton
          onPress={onReset}
          isDefault={isDefault}
          color={chevronColor}
          accessibilityLabel="Reset glass to default"
        />
      }
      badge={<Text className="font-ui-bold text-primary text-xs">{presetLabel(value)}</Text>}
      expanded={expanded}
      onToggle={onToggle}
      chevronColor={chevronColor}
      className="rounded-card border border-border bg-card p-3"
    >
      <View className="mb-3">
        <RangeSlider
          value={value}
          min={0}
          max={100}
          step={5}
          accentColor={accentColor}
          onChange={onChange}
        />
      </View>

      <View className="flex-row gap-1.5">
        {TRANSLUCENCY_PRESETS.map((preset) => {
          const isSelected = value === preset;
          return (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Set glass to ${presetLabel(preset)}`}
              className={`flex-1 items-center rounded border py-1.5 ${
                isSelected ? "border-primary bg-input" : "border-border bg-input"
              }`}
              onPress={() => onChange(preset)}
            >
              <Text
                className={`font-ui text-xs ${
                  isSelected ? "font-bold text-primary" : "text-text-muted"
                }`}
              >
                {presetLabel(preset)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </CollapsibleSection>
  );
}
