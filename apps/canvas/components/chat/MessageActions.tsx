import { CHAT_COPY, MIND_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  PencilEdit02Icon,
  RefreshIcon,
  VolumeHighIcon,
} from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface MessageActionsProps {
  characterId: string;
  isEditing: boolean;
  isBusy?: boolean;
  hasAudio?: boolean;
  isSpeaking?: boolean;
  canRevise?: boolean;
  canEdit?: boolean;
  canSpeak?: boolean;
  onRegenerate: () => void;
  onAnother: () => void;
  onSpeak: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function MessageActions({
  characterId,
  isEditing,
  isBusy = false,
  hasAudio = false,
  isSpeaking = false,
  canRevise = true,
  canEdit = true,
  canSpeak = true,
  onRegenerate,
  onAnother,
  onSpeak,
  onEdit,
  onSave,
  onCancel,
}: MessageActionsProps) {
  const theme = useResolvedTheme(characterId);

  const button = (
    label: string,
    icon: Parameters<typeof AppIcon>[0]["icon"],
    tint: string,
    onPress: () => void,
    showLabel = false,
  ) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isBusy }}
      disabled={isBusy}
      hitSlop={8}
      onPress={onPress}
      className={
        showLabel
          ? "h-7 flex-row items-center gap-1.5 rounded-button px-2"
          : "h-7 w-7 items-center justify-center rounded-full"
      }
      style={{ opacity: isBusy ? 0.4 : 1 }}
    >
      <AppIcon icon={icon} size={showLabel ? 12 : 13} color={tint} strokeWidth={1.8} />
      {showLabel ? (
        <Text className="font-ui-medium text-[11px]" style={{ color: tint }}>
          {label}
        </Text>
      ) : null}
    </PressableScale>
  );

  return (
    <View className="mt-1 ml-1 flex-row items-center gap-1">
      {isEditing ? (
        <>
          {button(MIND_COPY.cancel, Cancel01Icon, theme.textMuted, onCancel, true)}
          {button(CHAT_COPY.saveMessage, CheckmarkCircle01Icon, theme.primary, onSave, true)}
        </>
      ) : (
        <>
          {canRevise
            ? button(CHAT_COPY.regenerate, RefreshIcon, theme.primary, onRegenerate)
            : null}
          {canRevise
            ? button(CHAT_COPY.anotherReply, ArrowRight01Icon, theme.textMuted, onAnother)
            : null}
          {canSpeak
            ? button(
                hasAudio ? CHAT_COPY.respeakMessage : CHAT_COPY.speakMessage,
                VolumeHighIcon,
                isSpeaking ? theme.primary : theme.textMuted,
                onSpeak,
              )
            : null}
          {canEdit
            ? button(CHAT_COPY.editMessage, PencilEdit02Icon, theme.textMuted, onEdit)
            : null}
        </>
      )}
    </View>
  );
}
