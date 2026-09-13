import { CHAT, CHAT_MS } from "@eidolon/config";
import { View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { GlassSurface } from "@/components/ui/glass-surface";
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
      className="z-10 flex-row items-center gap-2 self-start px-3 py-1.5"
      style={{ marginBottom: -overlap, paddingBottom: overlap + 6 }}
    >
      <GlassSurface
        tint="card"
        characterId={characterId}
        pointerEvents="none"
        className="absolute"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: Math.max(0, overlap - theme.borderWidth),
          borderTopLeftRadius: theme.radius,
          borderTopRightRadius: theme.radius,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      />

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
