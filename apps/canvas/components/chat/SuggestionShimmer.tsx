import { CHAT, CHAT_MS } from "@eidolon/config";
import * as React from "react";
import { View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

const ROW_WIDTHS = ["78%", "62%", "70%"] as const;

export interface SuggestionShimmerProps {
  characterId?: string;
}

export function SuggestionShimmer({ characterId }: SuggestionShimmerProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  const rows = React.useMemo(
    () => Array.from({ length: CHAT.suggestionCount }, (_, index) => index),
    [],
  );

  return (
    <View accessibilityLabel="Loading reply options" accessibilityRole="progressbar">
      {rows.map((index) => (
        <View
          key={index}
          className={index === 0 ? "px-3.5 py-3" : "border-border border-t px-3.5 py-3"}
        >
          <Animated.View
            style={[
              {
                height: CHAT.shimmerBarHeightPx,
                width: ROW_WIDTHS[index % ROW_WIDTHS.length],
                borderRadius: CHAT.shimmerBarRadiusPx,
                backgroundColor: theme.primary,
                opacity: 0.18,
              },
              !reduced && {
                animationName: {
                  "0%": { opacity: 0.12 },
                  "50%": { opacity: 0.42 },
                  "100%": { opacity: 0.12 },
                },
                animationDuration: CHAT_MS.shimmer,
                animationDelay: index * CHAT_MS.waveformStagger,
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-in-out",
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}
