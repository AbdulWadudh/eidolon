import { CALL_COPY, callDurationLabel, callTitle } from "@eidolon/config";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { ArrowLeft01Icon, VolumeHighIcon, VolumeOffIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface CallTopBarProps {
  characterId: string;
  characterName: string;
  elapsedSeconds: number;
  isSpeakerOn: boolean;
  onBack: () => void;
  onToggleSpeaker: () => void;
}

export function CallTopBar({
  characterId,
  characterName,
  elapsedSeconds,
  isSpeakerOn,
  onBack,
  onToggleSpeaker,
}: CallTopBarProps) {
  const theme = useResolvedTheme(characterId);
  const duration = callDurationLabel(elapsedSeconds);

  return (
    <View className="flex-row items-center gap-3 border-border border-b px-4 py-3">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={CALL_COPY.back}
        hitSlop={12}
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-button border border-border bg-card"
      >
        <AppIcon icon={ArrowLeft01Icon} size={20} color={theme.textPrimary} />
      </PressableScale>

      <View className="flex-1 items-center">
        <Text
          className="font-main-bold text-text-primary"
          style={{ fontSize: 18 }}
          numberOfLines={1}
        >
          {callTitle(characterName)}
        </Text>
        <Text
          accessibilityLabel={`Call duration ${duration}`}
          className="mt-0.5 font-ui-bold text-xs"
          style={{ color: theme.primary, fontVariant: ["tabular-nums"] }}
        >
          {duration}
        </Text>
      </View>

      <PressableScale
        accessibilityRole="switch"
        accessibilityState={{ checked: isSpeakerOn }}
        accessibilityLabel={isSpeakerOn ? CALL_COPY.speakerOn : CALL_COPY.speakerOff}
        hitSlop={12}
        onPress={onToggleSpeaker}
        className="h-11 w-11 items-center justify-center rounded-button border border-border bg-card"
      >
        <AppIcon
          icon={isSpeakerOn ? VolumeHighIcon : VolumeOffIcon}
          size={20}
          color={isSpeakerOn ? theme.primary : theme.textMuted}
        />
      </PressableScale>
    </View>
  );
}
