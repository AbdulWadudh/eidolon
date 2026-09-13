import { CHAT, CHAT_MS } from "@eidolon/config";
import { View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface SkeletonLineProps {
  characterId?: string;
  width: number;
  height?: number;
  label?: string;
}

export function SkeletonLine({ characterId, width, height, label }: SkeletonLineProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label}>
      <Animated.View
        style={[
          {
            width,
            height: height ?? CHAT.shimmerBarHeightPx,
            borderRadius: CHAT.shimmerBarRadiusPx,
            backgroundColor: theme.textMuted,
            opacity: 0.22,
          },
          !reduced && {
            animationName: {
              "0%": { opacity: 0.14 },
              "50%": { opacity: 0.38 },
              "100%": { opacity: 0.14 },
            },
            animationDuration: CHAT_MS.shimmer,
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-in-out",
          },
        ]}
      />
    </View>
  );
}
