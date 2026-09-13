import { MOMENT_COPY, PHOTO, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface ChatBackdropProps {
  uri: string | null;
  characterId: string;
  arrivedAt?: string | null;
  onArrivalSeen?: () => void;
}

function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${value}`;
}

export function ChatBackdrop({ uri, characterId, arrivedAt, onArrivalSeen }: ChatBackdropProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (!arrivedAt || !onArrivalSeen) return;

    const timer = setTimeout(onArrivalSeen, UI_MS.stageCaptionHold);
    return () => clearTimeout(timer);
  }, [arrivedAt, onArrivalSeen]);

  if (!uri) return null;

  const fade = [
    withAlpha(theme.canvas, PHOTO.backdropFadeOpacity),
    withAlpha(theme.canvas, PHOTO.backdropFadeMidOpacity),
    withAlpha(theme.canvas, 0),
  ] as const;

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Image
        source={{ uri }}
        contentFit="cover"
        cachePolicy="disk"
        transition={reduced ? 0 : { duration: UI_MS.stageCrossfade, effect: "cross-dissolve" }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <LinearGradient
        colors={fade}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${PHOTO.backdropFadePercent}%`,
        }}
      />

      <LinearGradient
        colors={[...fade].reverse() as unknown as readonly [string, string, string]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${PHOTO.backdropFadePercent}%`,
        }}
      />

      {arrivedAt ? (
        <Animated.View
          key={arrivedAt}
          entering={
            reduced
              ? FadeIn.duration(UI_MS.revealReduced)
              : FadeInDown.duration(UI_MS.reveal).delay(UI_MS.stageCrossfade / 2)
          }
          exiting={FadeOut.duration(UI_MS.reveal)}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${MOMENT_COPY.arrived} ${arrivedAt}`}
          className="absolute right-0 left-0 items-center px-8"
          style={{ top: `${PHOTO.backdropFadePercent - 10}%` }}
        >
          <Text
            className="font-ui text-[10px] uppercase tracking-[2px]"
            style={{ color: theme.primary }}
          >
            {MOMENT_COPY.captionLead}
          </Text>
          <Text
            className="mt-1.5 text-center font-main text-[15px] leading-[21px]"
            style={{ color: theme.textPrimary }}
            numberOfLines={2}
          >
            {arrivedAt}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
