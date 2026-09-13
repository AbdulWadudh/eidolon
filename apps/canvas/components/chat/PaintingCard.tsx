import { CHAT, CHAT_MS, PHOTO_COPY } from "@eidolon/config";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { GlassSurface } from "@/components/ui/glass-surface";
import { withAlpha } from "@/lib/translucency";
import { useResolvedTheme } from "@/store/theme-store";

export interface PaintingCardProps {
  step: number;
  total: number;
  detail: string | null;
  characterId?: string;
}

function softGradient(color: string, peak: number) {
  const at = (stop: number) => withAlpha(color, stop * peak);
  return [at(0), at(0.12), at(0.45), at(1), at(0.45), at(0.12), at(0)] as const;
}

export function PaintingCard({ step, total, detail, characterId }: PaintingCardProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const [width, setWidth] = React.useState(0);

  const progress = total > 0 ? Math.min(1, step / total) : 0;
  const sweepWidth = width * CHAT.imageSweepWidthRatio;
  const animate = sweepWidth > 0 && !reduced;

  const sheen = React.useMemo(
    () => softGradient(theme.primary, CHAT.imageSheenOpacity),
    [theme.primary],
  );
  const glow = React.useMemo(
    () => softGradient(theme.primary, CHAT.imageGlowOpacity),
    [theme.primary],
  );

  return (
    <View className="my-1.5 mr-10 items-start">
      <GlassSurface
        accessibilityRole="progressbar"
        accessibilityLabel={detail ?? PHOTO_COPY.taking}
        tint="input"
        characterId={characterId}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        className="w-full overflow-hidden border border-primary/25"
        style={{ aspectRatio: CHAT.imageAspectRatio, borderRadius: theme.radius }}
      >
        {animate ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: sweepWidth,
                animationName: {
                  "0%": { transform: [{ translateX: -sweepWidth * 0.75 }], opacity: 0.4 },
                  "50%": { transform: [{ translateX: width * 0.45 }], opacity: 1 },
                  "100%": { transform: [{ translateX: -sweepWidth * 0.75 }], opacity: 0.4 },
                },
                animationDuration: CHAT_MS.imageSweep,
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-in-out",
              }}
            >
              <LinearGradient
                colors={sheen}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: sweepWidth,
                animationName: {
                  "0%": { transform: [{ translateX: width * 0.55 }], opacity: 0.45 },
                  "50%": { transform: [{ translateX: -sweepWidth * 0.55 }], opacity: 0.9 },
                  "100%": { transform: [{ translateX: width * 0.55 }], opacity: 0.45 },
                },
                animationDuration: CHAT_MS.imageGlow,
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-in-out",
              }}
            >
              <LinearGradient
                colors={glow}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </>
        ) : null}

        <View className="flex-1 justify-end">
          <View className="gap-2 px-3 pt-6 pb-3">
            <View
              className="h-1 w-full overflow-hidden bg-border"
              style={{ borderRadius: CHAT.waveformBarRadiusPx }}
            >
              <View
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: "100%",
                  backgroundColor: theme.primary,
                }}
              />
            </View>

            <Text
              accessibilityLiveRegion="polite"
              className="font-ui text-text-muted text-xs uppercase tracking-wider"
            >
              {detail ?? PHOTO_COPY.taking}
            </Text>
          </View>
        </View>
      </GlassSurface>
    </View>
  );
}
