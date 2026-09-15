import { CHARACTER_COPY } from "@eidolon/config";
import { ActivityIndicator, Text } from "react-native";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useResolvedTheme } from "@/store/theme-store";

export interface StartConversationProps {
  characterId: string;
  characterName: string;
  isStarting: boolean;
  onStart: () => void;
}

/** Stands in for the input until this user has said they want to talk to her. */
export function StartConversation({
  characterId,
  characterName,
  isStarting,
  onStart,
}: StartConversationProps) {
  const theme = useResolvedTheme(characterId);

  return (
    <GlassSurface tint="card" className="gap-2.5 border-border border-t px-4 pt-3 pb-5">
      {characterName.length > 0 ? (
        <Text className="text-center font-main text-[13px] text-text-muted italic">
          {CHARACTER_COPY.startConversationInvite(characterName)}
        </Text>
      ) : null}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={CHARACTER_COPY.startConversation}
        accessibilityState={{ busy: isStarting, disabled: isStarting }}
        disabled={isStarting}
        onPress={onStart}
        className="h-11 flex-row items-center justify-center gap-2 rounded-button"
        style={{ backgroundColor: theme.primary, opacity: isStarting ? 0.6 : 1 }}
      >
        {isStarting ? <ActivityIndicator size="small" color={theme.textPrimary} /> : null}
        <Text className="font-ui-medium text-sm text-text-primary">
          {isStarting ? CHARACTER_COPY.startingConversation : CHARACTER_COPY.startConversation}
        </Text>
      </PressableScale>
    </GlassSurface>
  );
}
