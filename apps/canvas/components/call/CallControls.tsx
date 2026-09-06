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
  canTalk: boolean;
  onToggleMute: () => void;
  onTalkStart: () => void;
  onTalkEnd: () => void;
  onEnd: () => void;
}

export function CallControls({
  characterId,
  isMuted,
  isListening,
  canTalk,
  onToggleMute,
  onTalkStart,
  onTalkEnd,
  onEnd,
}: CallControlsProps) {
  const theme = useResolvedTheme(characterId);
  const hint = isListening ? CALL_COPY.releaseToSend : CALL_COPY.holdToTalk;

  return (
    <View className="flex-row items-center justify-center gap-6">
      <PressableScale
        accessibilityRole="switch"
        accessibilityState={{ checked: isMuted }}
        accessibilityLabel={isMuted ? CALL_COPY.unmute : CALL_COPY.mute}
        hitSlop={8}
        onPress={onToggleMute}
        className="items-center justify-center rounded-full border border-border bg-card"
        style={{ width: CALL.muteButtonPx, height: CALL.muteButtonPx }}
      >
        <AppIcon
          icon={isMuted ? MicOff01Icon : Mic01Icon}
          size={22}
          color={isMuted ? theme.danger : theme.textPrimary}
        />
      </PressableScale>

      <View className="items-center">
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !canTalk, busy: isListening }}
          accessibilityLabel={CALL_COPY.holdToTalk}
          accessibilityHint={CALL_COPY.interrupt}
          disabled={!canTalk}
          hitSlop={8}
          onPressIn={onTalkStart}
          onPressOut={onTalkEnd}
          className="items-center justify-center rounded-full"
          style={{
            width: CALL.interruptButtonPx,
            height: CALL.interruptButtonPx,
            backgroundColor: isListening ? theme.success : theme.primary,
            borderWidth: CALL.avatarBorderPx,
            borderColor: isListening ? theme.textPrimary : "transparent",
            opacity: canTalk ? 1 : 0.45,
          }}
        >
          <AppIcon
            icon={isListening ? Mic01Icon : HandIcon}
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
