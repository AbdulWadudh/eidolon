import { CHAT, CHAT_MS } from "@eidolon/config";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface PaintingCardProps {
  step: number;
  total: number;
  detail: string | null;
  characterId?: string;
}

export function PaintingCard({ step, total, detail, characterId }: PaintingCardProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const progress = total > 0 ? Math.min(1, step / total) : 0;

  return (
    <View className="my-1.5 mr-10 items-start">
      <View
        className="w-full overflow-hidden border border-primary/25 bg-card"
        style={{ aspectRatio: CHAT.imageAspectRatio, borderRadius: theme.radius }}
      >
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 bg-input"
          style={
            reduced
              ? undefined
              : {
                  animationName: { from: { opacity: 0.4 }, to: { opacity: 0.8 } },
                  animationDuration: CHAT_MS.shimmer,
                  animationIterationCount: "infinite",
                  animationDirection: "alternate",
                  animationTimingFunction: "ease-in-out",
                }
          }
        />

        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text
            accessibilityLiveRegion="polite"
            className="font-ui text-text-muted text-xs uppercase tracking-wider"
          >
            {detail ?? "Taking the photo"}
          </Text>

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

          {total > 0 ? (
            <Text
              className="font-ui text-text-muted text-xs"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {step} / {total}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
