import { Image } from "expo-image";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft01Icon, Call02Icon, MoreVerticalIcon } from "@/lib/icons";
import type { MindState } from "@/store/chat-messages";
import type { AvatarCropRect } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

export interface ChatTopBarProps {
  characterName: string;
  avatarUrl?: string | null;
  avatarCrop?: AvatarCropRect | null;
  onAvatarPress?: () => void;
  characterId: string;
  statusLabel: string;
  statusColor: string;
  mind: MindState | null;
  onBack: () => void;
  onCall: () => void;
  onOverflow: () => void;
}

const AVATAR_PX = 38;

// The crop names a circle inside the photo. Rebuilding it is arithmetic rather
// than a transform: draw the photo at the size that makes that circle exactly
// the avatar's width, then move it so the circle's centre lands in the middle.
// Because both ratios come from the same picture, the box keeps its aspect and
// "fill" does not distort.
function croppedStyle(crop: AvatarCropRect) {
  const width = AVATAR_PX * crop.widthRatio;
  const height = AVATAR_PX * crop.heightRatio;

  return {
    position: "absolute" as const,
    width,
    height,
    left: AVATAR_PX / 2 - crop.cx * width,
    top: AVATAR_PX / 2 - crop.cy * height,
  };
}

export function ChatTopBar({
  characterName,
  avatarUrl,
  avatarCrop,
  onAvatarPress,
  characterId,
  statusLabel,
  statusColor,
  mind,
  onBack,
  onCall,
  onOverflow,
}: ChatTopBarProps) {
  const theme = useResolvedTheme(characterId);
  const initials = characterName.slice(0, 2).toUpperCase();

  return (
    <View className="flex-row items-center gap-2 border-border border-b px-3 py-2">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Back to characters"
        hitSlop={8}
        onPress={onBack}
        className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card"
      >
        <AppIcon icon={ArrowLeft01Icon} size={20} color={theme.textPrimary} />
      </PressableScale>

      <PressableScale
        accessibilityRole="imagebutton"
        accessibilityLabel={`${characterName}'s profile picture`}
        disabled={!avatarUrl}
        onPress={onAvatarPress}
      >
        <Avatar size={AVATAR_PX} className="overflow-hidden border-2 border-primary">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              contentFit={avatarCrop ? "fill" : "cover"}
              cachePolicy="disk"
              accessibilityLabel={`${characterName}'s picture`}
              style={avatarCrop ? croppedStyle(avatarCrop) : { width: "100%", height: "100%" }}
            />
          ) : (
            <AvatarFallback textClassName="font-main-bold text-xs text-primary">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
      </PressableScale>

      <View className="flex-1 pl-0.5">
        <Text className="font-main-bold text-base text-text-primary" numberOfLines={1}>
          {characterName}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          <Text className="flex-1 font-ui text-xs text-text-muted" numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
        {mind ? (
          <Text className="font-ui text-xs text-text-muted" numberOfLines={2}>
            {mind.tier} · Affinity{" "}
            <Text className="font-ui-bold text-primary">{mind.affinity}</Text>
          </Text>
        ) : null}
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Call ${characterName}`}
        hitSlop={8}
        onPress={onCall}
        className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card"
      >
        <AppIcon icon={Call02Icon} size={19} color={theme.primary} />
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={8}
        onPress={onOverflow}
        className="h-10 w-8 items-center justify-center rounded-button"
      >
        <AppIcon icon={MoreVerticalIcon} size={19} color={theme.textMuted} />
      </PressableScale>
    </View>
  );
}
