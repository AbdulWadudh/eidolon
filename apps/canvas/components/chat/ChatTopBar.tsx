import { AFFINITY_HUD, affinityLabel, EASING_BEZIER, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import Animated, { cubicBezier, FadeIn, useReducedMotion } from "react-native-reanimated";
import { AffinityToast } from "@/components/chat/AffinityToast";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { croppedStyle } from "@/lib/avatar-crop";
import { ArrowLeft01Icon, Call02Icon, MoreVerticalIcon } from "@/lib/icons";
import { useAffinityStore } from "@/store/affinity-store";
import type { MindState } from "@/store/chat-messages";
import type { AvatarCropRect } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

export interface ChatTopBarProps {
  characterName: string;
  avatarUrl?: string | null;
  avatarCrop?: AvatarCropRect | null;
  onAvatarPress?: () => void;
  onOpenProfile?: () => void;
  characterId: string;
  statusLabel: string;
  statusColor: string;
  isBusy: boolean;
  mind: MindState | null;
  onBack: () => void;
  onOverflow: () => void;
  onCall?: () => void;
}

const AVATAR_PX = 38;

// The crop names a circle inside the photo. Rebuilding it is arithmetic rather

export function ChatTopBar({
  characterName,
  avatarUrl,
  avatarCrop,
  onAvatarPress,
  onOpenProfile,
  characterId,
  statusLabel,
  statusColor,
  isBusy,
  mind,
  onBack,
  onOverflow,
  onCall,
}: ChatTopBarProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const insight = useAffinityStore((state) => state.isInsightModeEnabled);
  const initials = characterName.slice(0, 2).toUpperCase();

  // Insight mode replaces the mood line with the numbers rather than stacking a
  // second row under it. A turn in progress still wins: what she is doing right
  // now matters more than where the relationship stands.
  const showsAffinity = insight && !isBusy && mind !== null;
  const subtitle = showsAffinity && mind ? affinityLabel(mind.tier, mind.affinity) : statusLabel;

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
        className="relative"
      >
        <Animated.View
          className="overflow-hidden rounded-full"
          style={{
            borderWidth: AFFINITY_HUD.ringWidthPx,
            borderColor: insight ? theme.primary : "transparent",
            transitionProperty: "borderColor",
            transitionDuration: reduced ? 0 : AFFINITY_HUD.ringTransitionMs,
            transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
          }}
        >
          <Avatar size={AVATAR_PX} className="overflow-hidden">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                contentFit={avatarCrop ? "fill" : "cover"}
                cachePolicy="disk"
                accessibilityLabel={`${characterName}'s picture`}
                style={
                  avatarCrop
                    ? croppedStyle(avatarCrop, AVATAR_PX)
                    : { width: "100%", height: "100%" }
                }
              />
            ) : (
              <AvatarFallback textClassName="font-main-bold text-xs text-primary">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
        </Animated.View>
        <AffinityToast characterId={characterId} />
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${characterName}'s profile and pictures`}
        disabled={!onOpenProfile}
        onPress={onOpenProfile}
        className="flex-1 pl-0.5"
      >
        <Text className="font-main-bold text-base text-text-primary" numberOfLines={1}>
          {characterName}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Animated.View
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: statusColor,
              transitionProperty: "backgroundColor",
              transitionDuration: UI_MS.disclosure,
              transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
            }}
          />
          <Animated.Text
            key={subtitle}
            entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
            accessibilityLiveRegion="polite"
            className={
              showsAffinity
                ? "flex-1 font-ui-bold text-primary text-xs"
                : "flex-1 font-ui text-text-muted text-xs"
            }
            numberOfLines={1}
          >
            {subtitle}
          </Animated.Text>
        </View>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Call ${characterName}`}
        disabled={!onCall}
        hitSlop={8}
        onPress={onCall}
        className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card"
      >
        <AppIcon icon={Call02Icon} size={18} color={theme.primary} />
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
