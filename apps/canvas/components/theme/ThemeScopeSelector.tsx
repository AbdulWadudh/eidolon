import { THEME_COPY } from "@eidolon/config";
import { Pressable, Text, View } from "react-native";
import { Badge } from "@/components/ui/badge";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

export type ThemeScope = "global" | "character";

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
        <Pressable
          className={`flex-1 items-center rounded-button border py-2 ${
            scope === "global" ? "bg-primary" : "border-border bg-input"
          }`}
          onPress={() => onChange("global")}
        >
          <Text
            className={`font-ui-medium text-xs ${
              scope === "global" ? "font-bold text-primary-foreground" : "text-text-muted"
            }`}
          >
            Global Master Default
          </Text>
        </Pressable>

        <Pressable
          className={`flex-1 items-center rounded-button border py-2 ${
            scope === "character" ? "bg-primary" : "border-border bg-input"
          }`}
          onPress={() => onChange("character")}
        >
          <Text
            className={`font-ui-medium text-xs ${
              scope === "character" ? "font-bold text-primary-foreground" : "text-text-muted"
            }`}
          >
            {characterName} Override
          </Text>
        </Pressable>
      </View>

      {scope === "character" && (
        <View className="mt-3 flex-row items-center justify-between border-border border-t pt-2">
          <Text className="font-ui text-text-muted text-xs">Status</Text>
          <Badge variant={characterHasOverrides ? "warning" : "muted"}>
            {characterHasOverrides ? THEME_COPY.ownLook : THEME_COPY.sameAsEveryone}
          </Badge>
        </View>
      )}
    </CollapsibleSection>
  );
}
