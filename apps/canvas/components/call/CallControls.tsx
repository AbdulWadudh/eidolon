import { CALL, CALL_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { CallEnd01Icon, HandIcon, Mic01Icon, MicOff01Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface CallControlsProps {
  characterId: string;
  isMuted: boolean;
  isListening: boolean;
  isAuto: boolean;
  canTalk: boolean;
  canInterrupt: boolean;
  onToggleMute: () => void;
  onTalkToggle: () => void;
  onInterrupt: () => void;
  onEnd: () => void;
}

export function CallControls({
  characterId,
  isMuted,
  isListening,
  isAuto,
  canTalk,
  canInterrupt,
  onToggleMute,
  onTalkToggle,
  onInterrupt,
  onEnd,
}: CallControlsProps) {
  const theme = useResolvedTheme(characterId);
  const hint = isAuto
    ? isListening
      ? CALL_COPY.justTalk
      : CALL_COPY.interrupt
    : isListening
      ? CALL_COPY.tapToSend
      : CALL_COPY.tapToTalk;

  const centreEnabled = isAuto ? canInterrupt : canTalk;
  const centreLabel = isAuto
    ? CALL_COPY.cutInHint
    : isListening
      ? CALL_COPY.sendWhatYouSaid
      : CALL_COPY.startTalking;

  return (
    <View className="flex-row items-center justify-center gap-6">
      <PressableScale
        accessibilityRole="switch"
        accessibilityState={{ checked: isMuted }}
        accessibilityLabel={isMuted ? CALL_COPY.unmute : CALL_COPY.mute}
        hitSlop={8}
        onPress={onToggleMute}
        className="items-center justify-center rounded-full border bg-card"
        style={{
          width: CALL.muteButtonPx,
          height: CALL.muteButtonPx,
          borderColor: isListening && !isMuted ? theme.success : theme.cardBorder,
        }}
      >
        <AppIcon
          icon={isMuted ? MicOff01Icon : Mic01Icon}
          size={22}
          color={isMuted ? theme.danger : isListening ? theme.success : theme.textPrimary}
        />
      </PressableScale>

      <View className="items-center">
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !centreEnabled, busy: isListening }}
          accessibilityLabel={centreLabel}
          disabled={!centreEnabled}
          hitSlop={8}
          onPress={isAuto ? onInterrupt : onTalkToggle}
          className="items-center justify-center rounded-full"
          style={{
            width: CALL.interruptButtonPx,
            height: CALL.interruptButtonPx,
            backgroundColor: isAuto || !isListening ? theme.primary : theme.success,
            borderWidth: CALL.avatarBorderPx,
            borderColor: !isAuto && isListening ? theme.textPrimary : "transparent",
            opacity: centreEnabled ? 1 : 0.45,
          }}
        >
          <AppIcon
            icon={!isAuto && isListening ? Mic01Icon : HandIcon}
            size={30}
            color={theme.primaryForeground}
            strokeWidth={2}
          />
        </PressableScale>
        <Text
          accessibilityLiveRegion="polite"
          className="mt-2 font-ui-medium text-[11px] text-text-muted"
        >
          {hint}
        </Text>
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={CALL_COPY.endCall}
        hitSlop={8}
        onPress={onEnd}
        className="items-center justify-center rounded-full"
        style={{
          width: CALL.endButtonPx,
          height: CALL.endButtonPx,
          backgroundColor: theme.danger,
        }}
      >
        <AppIcon icon={CallEnd01Icon} size={22} color={theme.textPrimary} strokeWidth={2} />
      </PressableScale>
    </View>
  );
}
