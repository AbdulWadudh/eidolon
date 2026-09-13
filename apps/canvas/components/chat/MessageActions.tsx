import { CHAT, CHAT_COPY, MIND_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
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

const ACTION_PX = 24;
const ICON_PX = 13;

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
  const overlap = CHAT.audioTabOverlapPx;

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
          ? "flex-row items-center justify-center gap-1.5 rounded-button px-2"
          : "items-center justify-center rounded-full"
      }
      style={{
        height: ACTION_PX,
        width: showLabel ? undefined : ACTION_PX,
        opacity: isBusy ? 0.4 : 1,
      }}
    >
      <View
        className="items-center justify-center"
        style={{ height: ICON_PX, width: ICON_PX }}
        pointerEvents="none"
      >
        <AppIcon icon={icon} size={ICON_PX} color={tint} strokeWidth={1.8} />
      </View>
      {showLabel ? (
        <Text className="font-ui-medium text-[11px]" style={{ color: tint }}>
          {label}
        </Text>
      ) : null}
    </PressableScale>
  );

  return (
    <View className="self-start" style={{ marginTop: -overlap }}>
      <GlassSurface
        tint="card"
        characterId={characterId}
        pointerEvents="none"
        className="absolute"
        style={{
          top: Math.max(0, overlap - theme.borderWidth),
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: theme.radius,
          borderBottomRightRadius: theme.radius,
          borderColor: theme.cardBorder,
          borderTopWidth: 0,
          borderLeftWidth: theme.borderWidth,
          borderRightWidth: theme.borderWidth,
          borderBottomWidth: theme.borderWidth,
        }}
      />

      <View
        className="flex-row items-center gap-1 px-1.5 pb-0.5"
        style={{ paddingTop: overlap + 2 }}
      >
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
    </View>
  );
}
