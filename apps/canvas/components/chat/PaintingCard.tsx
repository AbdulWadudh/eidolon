import { CHAT, CHAT_MS } from "@eidolon/config";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface PaintingCardProps {
  step: number;
  total: number;
  detail: string | null;
  preview?: string | null;
  characterId?: string;
}

export function PaintingCard({ step, total, detail, preview, characterId }: PaintingCardProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const progress = total > 0 ? Math.min(1, step / total) : 0;

  return (
    <View className="my-1.5 mr-10 items-start">
      <View
        className="w-full overflow-hidden border border-primary/25 bg-card"
        style={{ aspectRatio: CHAT.imageAspectRatio, borderRadius: theme.radius }}
      >
        {preview ? (
          <Image
            source={{ uri: preview }}
            contentFit="cover"
            transition={0}
            accessibilityLabel="The photo as it is being taken"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}

        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 bg-input"
          style={
            preview
              ? { opacity: 0 }
              : reduced
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

        {/* Along the bottom rather than across the middle: the point of the
            preview is watching the picture arrive, and a centred label sits on
            top of the part worth looking at. */}
        <View className="flex-1 justify-end">
          <View
            className="gap-2 px-3 pt-6 pb-3"
            style={{ backgroundColor: preview ? "rgba(0,0,0,0.45)" : "transparent" }}
          >
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

            <View className="flex-row items-center justify-between">
              <Text
                accessibilityLiveRegion="polite"
                className="font-ui text-text-muted text-xs uppercase tracking-wider"
              >
                {detail ?? "Taking the photo"}
              </Text>

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
      </View>
    </View>
  );
}
