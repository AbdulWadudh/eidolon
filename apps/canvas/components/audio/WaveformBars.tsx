import { CHAT, CHAT_MS } from "@eidolon/config";
import * as React from "react";
import { View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

const BAR_SCALES = [0.45, 1, 0.65, 0.85] as const;

export interface WaveformBarsProps {
  isPlaying: boolean;
  color: string;
}

export function WaveformBars({ isPlaying, color }: WaveformBarsProps) {
  const reduced = useReducedMotion();
  const animate = isPlaying && !reduced;

  const bars = React.useMemo(
    () => Array.from({ length: CHAT.waveformBars }, (_, index) => index),
    [],
  );

  return (
    <View
      accessible={false}
      className="flex-row items-center gap-[3px]"
      style={{ height: CHAT.audioPillWaveformHeightPx }}
    >
      {bars.map((index) => (
        <Animated.View
          key={index}
          style={[
            {
              width: CHAT.waveformBarWidthPx,
              height: CHAT.audioPillWaveformHeightPx,
              borderRadius: CHAT.waveformBarRadiusPx,
              backgroundColor: color,
              transform: [{ scaleY: BAR_SCALES[index % BAR_SCALES.length] }],
            },
            animate && {
              animationName: {
                "0%": { transform: [{ scaleY: 0.35 }] },
                "50%": { transform: [{ scaleY: 1 }] },
                "100%": { transform: [{ scaleY: 0.35 }] },
              },
              animationDuration: CHAT_MS.waveformBar,
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
