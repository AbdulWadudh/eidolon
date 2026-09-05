import { CHAT, CHAT_MS } from "@eidolon/config";
import { View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface AudioTabSkeletonProps {
  characterId?: string;
  overlap: number;
}

export function AudioTabSkeleton({ characterId, overlap }: AudioTabSkeletonProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Recording a voice note"
      className="flex-row items-center gap-2 self-start border border-border bg-audio-pill px-3 py-1.5"
      style={{
        marginBottom: -overlap,
        paddingBottom: overlap + 6,
        borderRadius: theme.radius,
      }}
    >
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            {
              width: index === 1 ? 26 : CHAT.waveformBarWidthPx * 2,
              height: CHAT.waveformBarWidthPx * 2,
              borderRadius: CHAT.waveformBarRadiusPx * 2,
              backgroundColor: theme.primary,
              opacity: 0.25,
            },
            !reduced && {
              animationName: {
                "0%": { opacity: 0.15 },
                "50%": { opacity: 0.5 },
                "100%": { opacity: 0.15 },
              },
              animationDuration: CHAT_MS.shimmer,
              animationDelay: index * CHAT_MS.waveformStagger,
              animationIterationCount: "infinite",
              animationTimingFunction: "ease-in-out",
            },
          ]}
        />
      ))}
    </View>
  );
}
