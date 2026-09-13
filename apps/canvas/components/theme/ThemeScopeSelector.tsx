import { THEME_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/common/pressable-scale";
import { Badge } from "@/components/ui/badge";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { withAlpha } from "@/lib/translucency";
import { useResolvedTheme } from "@/store/theme-store";

export type ThemeScope = "global" | "character";

const OPTIONS: ThemeScope[] = ["global", "character"];
const SELECTED_ALPHA = 0.14;

export interface ThemeScopeSelectorProps {
  scope: ThemeScope;
  characterName: string;
  characterHasOverrides: boolean;
  expanded: boolean;
  chevronColor: string;
  onToggle: (key: string) => void;
  onChange: (scope: ThemeScope) => void;
}

export function ThemeScopeSelector({
  scope,
  characterName,
  characterHasOverrides,
  expanded,
  chevronColor,
  onToggle,
  onChange,
}: ThemeScopeSelectorProps) {
  const theme = useResolvedTheme();
  return (
    <CollapsibleSection
      sectionKey="scope"
      title={THEME_COPY.appliesTo}
      badge={
        <Text className="font-ui-bold text-[11px] text-text-primary">
          {scope === "global" ? THEME_COPY.everyone : characterName}
        </Text>
      }
      expanded={expanded}
      onToggle={onToggle}
      chevronColor={chevronColor}
      className="rounded-card border border-border bg-card p-3"
    >
      <View className="flex-row gap-2">
        {OPTIONS.map((option) => {
          const label =
            option === "global" ? THEME_COPY.everyone : `${characterName} ${THEME_COPY.onlyThem}`;
          const isSelected = scope === option;

          return (
            <PressableScale
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${THEME_COPY.appliesTo}: ${label}`}
              onPress={() => onChange(option)}
              className="flex-1 items-center rounded-button border py-2"
              style={{
                borderColor: isSelected ? theme.primary : theme.cardBorder,
                backgroundColor: isSelected
                  ? withAlpha(theme.primary, SELECTED_ALPHA)
                  : theme.inputSurface,
              }}
            >
              <Text
                className={isSelected ? "font-ui-bold text-xs" : "font-ui-medium text-xs"}
                style={{ color: isSelected ? theme.primary : theme.textMuted }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {scope === "character" && (
        <View className="mt-3 flex-row items-center justify-between border-border border-t pt-2">
          <Text className="font-ui text-text-muted text-xs">{THEME_COPY.status}</Text>
          <Badge variant={characterHasOverrides ? "warning" : "muted"}>
            {characterHasOverrides ? THEME_COPY.ownLook : THEME_COPY.sameAsEveryone}
          </Badge>
        </View>
      )}
    </CollapsibleSection>
  );
}
