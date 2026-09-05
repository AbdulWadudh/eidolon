import * as Haptics from "expo-haptics";
import { View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { ArrowRight01Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/store/theme-store";
import { RoleplayText } from "./RoleplayText";

export interface SuggestionRowProps {
  text: string;
  index: number;
  isFirst: boolean;
  characterId?: string;
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
}

export function SuggestionRow({
  text,
  index,
  isFirst,
  characterId,
  onSend,
  onEdit,
}: SuggestionRowProps) {
  const theme = useResolvedTheme(characterId);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Reply option ${index + 1}: ${text}`}
      accessibilityHint="Tap to send. Long press to edit before sending."
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onSend(text);
      }}
      onLongPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onEdit(text);
      }}
      className={cn(
        "flex-row items-center gap-3 px-3.5 py-3 active:bg-input",
        isFirst ? "" : "border-border border-t",
      )}
    >
      <View className="flex-1">
        <RoleplayText text={text} />
      </View>
      <AppIcon icon={ArrowRight01Icon} size={16} color={theme.textMuted} strokeWidth={2} />
    </PressableScale>
  );
}
