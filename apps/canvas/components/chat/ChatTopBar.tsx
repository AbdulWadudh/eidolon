import { AFFINITY_HUD, affinityLabel, CHAT_COPY, EASING_BEZIER, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import Animated, { cubicBezier, FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AffinityToast } from "@/components/chat/AffinityToast";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlassSurface } from "@/components/ui/glass-surface";
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
const ACTION_PX = AVATAR_PX;
const ICON_PX = 18;
const ICON_STROKE = 1.6;

const BAR_TOP_PX = 6;

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
  const insets = useSafeAreaInsets();
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const insight = useAffinityStore((state) => state.isInsightModeEnabled);
  const initials = characterName.slice(0, 2).toUpperCase();

  const showsAffinity = insight && !isBusy && mind !== null;
  const subtitle = showsAffinity && mind ? affinityLabel(mind.tier, mind.affinity) : statusLabel;

  return (
    <GlassSurface
      tint="canvas"
      characterId={characterId}
      className="flex-row items-center gap-1 border-border border-b px-2 pb-2"
      style={{ paddingTop: insets.top + BAR_TOP_PX }}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Back to characters"
        hitSlop={8}
        onPress={onBack}
        className="items-center justify-center rounded-button active:bg-card"
        style={{ height: ACTION_PX, width: ACTION_PX }}
      >
        <AppIcon
          icon={ArrowLeft01Icon}
          size={ICON_PX}
          color={theme.textPrimary}
          strokeWidth={ICON_STROKE}
        />
      </PressableScale>

      <PressableScale
        accessibilityRole="imagebutton"
        accessibilityLabel={`${characterName}'s profile picture`}
        disabled={!avatarUrl}
        hitSlop={8}
        onPress={onAvatarPress}
        className="relative ml-0.5"
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
        className="ml-2.5 flex-1 py-1 pr-1"
      >
        {characterName.length > 0 ? (
          <Text className="font-main-bold text-base text-text-primary" numberOfLines={1}>
            {characterName}
          </Text>
        ) : (
          <SkeletonLine
            characterId={characterId}
            width={120}
            height={14}
            label={CHAT_COPY.loadingName}
          />
        )}
        <View className="mt-0.5 flex-row items-center gap-1.5">
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
        accessibilityState={{ disabled: !onCall }}
        disabled={!onCall}
        hitSlop={8}
        onPress={onCall}
        className="items-center justify-center rounded-button active:bg-card"
        style={{ height: ACTION_PX, width: ACTION_PX, opacity: onCall ? 1 : 0.4 }}
      >
        <AppIcon icon={Call02Icon} size={ICON_PX} color={theme.primary} strokeWidth={ICON_STROKE} />
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={8}
        onPress={onOverflow}
        className="items-center justify-center rounded-button active:bg-card"
        style={{ height: ACTION_PX, width: ACTION_PX }}
      >
        <AppIcon
          icon={MoreVerticalIcon}
          size={ICON_PX}
          color={theme.textMuted}
          strokeWidth={ICON_STROKE}
        />
      </PressableScale>
    </GlassSurface>
  );
}
