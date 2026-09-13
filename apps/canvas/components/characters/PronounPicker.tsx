import { CHARACTER_COPY, PRONOUN_SETS, pronounsFor } from "@eidolon/config";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/common/pressable-scale";
import { useResolvedTheme } from "@/store/theme-store";

export interface PronounPickerProps {
  characterId?: string;
  value: string;
  onChange: (pronouns: string) => void;
}

export function PronounPicker({ characterId, value, onChange }: PronounPickerProps) {
  const theme = useResolvedTheme(characterId);
  const selected = pronounsFor(value);

  return (
    <View className="gap-1.5">
      <Text className="font-ui-bold text-[12px] text-text-primary">
        {CHARACTER_COPY.pronounsLabel}
      </Text>
      <Text className="font-ui text-[10.5px] text-text-muted leading-[14px]">
        {CHARACTER_COPY.pronounsHint}
      </Text>

      <View className="mt-0.5 flex-row gap-2">
        {Object.entries(PRONOUN_SETS).map(([key, set]) => {
          const isSelected = set.subject === selected.subject;

          return (
            <PressableScale
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={set.label}
              onPress={() => onChange(key)}
              className="flex-1 items-center border py-2"
              style={{
                borderRadius: theme.radius,
                borderColor: isSelected ? theme.primary : theme.cardBorder,
                backgroundColor: isSelected ? `${theme.primary}22` : theme.inputSurface,
              }}
            >
              <Text
                className="font-ui text-xs"
                style={{ color: isSelected ? theme.primary : theme.textPrimary }}
              >
                {set.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
