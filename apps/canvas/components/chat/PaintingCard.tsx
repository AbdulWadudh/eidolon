import { CHAT, CHAT_MS, PHOTO_COPY } from "@eidolon/config";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface PaintingCardProps {
  step: number;
  total: number;
  detail: string | null;
  characterId?: string;
}

function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${value}`;
}

export function PaintingCard({ step, total, detail, characterId }: PaintingCardProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const [width, setWidth] = React.useState(0);

  const progress = total > 0 ? Math.min(1, step / total) : 0;
  const sweepWidth = width * CHAT.imageSweepWidthRatio;

  const sheen = [
    withAlpha(theme.primary, 0),
    withAlpha(theme.primary, CHAT.imageSheenOpacity),
    withAlpha(theme.primary, 0),
  ] as const;

  return (
    <View className="my-1.5 mr-10 items-start">
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={detail ?? PHOTO_COPY.taking}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        className="w-full overflow-hidden border border-primary/25 bg-input"
        style={{ aspectRatio: CHAT.imageAspectRatio, borderRadius: theme.radius }}
      >
        {sweepWidth > 0 && !reduced ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: sweepWidth,
              animationName: {
                from: { transform: [{ translateX: -sweepWidth }] },
                to: { transform: [{ translateX: width }] },
              },
              animationDuration: CHAT_MS.imageSweep,
              animationIterationCount: "infinite",
              animationTimingFunction: "linear",
            }}
          >
            <LinearGradient
              colors={sheen}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
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
      </View>
    </View>
  );
}
