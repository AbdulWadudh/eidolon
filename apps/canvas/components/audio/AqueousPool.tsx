import { CALL, CALL_MS, EASING_BEZIER } from "@eidolon/config";
import type * as React from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

const EASE_OUT = Easing.bezier(...EASING_BEZIER.out);

const RINGS = Array.from({ length: CALL.ringCount }, (_, index) => index);

const OUTER_PX = CALL.ringBasePx + (CALL.ringCount - 1) * CALL.ringStepPx;
const FIELD_PX = Math.ceil(OUTER_PX * CALL.ringPeakScale);

function ringWeight(index: number): number {
  return 1 - index / CALL.ringCount;
}

export interface AqueousPoolProps {
  amplitude: SharedValue<number>;
  isActive: boolean;
  color: string;
  children: React.ReactNode;
}

interface RingProps {
  index: number;
  amplitude: SharedValue<number>;
  isActive: boolean;
  color: string;
  reduced: boolean;
}

function Ring({ index, amplitude, isActive, color, reduced }: RingProps) {
  const size = CALL.ringBasePx + index * CALL.ringStepPx;
  const weight = ringWeight(index);
  const timing = { duration: CALL_MS.amplitudeSettle, easing: EASE_OUT };

  const style = useAnimatedStyle(() => {
    const level = isActive ? Math.max(CALL.amplitudeFloor, amplitude.get()) : 0;
    const reach = level * weight;
    const opacity = CALL.ringRestOpacity + (CALL.ringPeakOpacity - CALL.ringRestOpacity) * reach;

    if (reduced) {
      return { opacity: withTiming(opacity, timing), transform: [{ scale: CALL.ringRestScale }] };
    }

    const scale = CALL.ringRestScale + (CALL.ringPeakScale - CALL.ringRestScale) * reach;

    return {
      opacity: withTiming(opacity, timing),
      transform: [{ scale: withTiming(scale, timing) }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: CALL.ringWidthPx,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

export function AqueousPool({ amplitude, isActive, color, children }: AqueousPoolProps) {
  const reduced = useReducedMotion();

  return (
    <View
      accessible={false}
      pointerEvents="box-none"
      className="items-center justify-center"
      style={{ width: FIELD_PX, height: FIELD_PX }}
    >
      {RINGS.map((index) => (
        <Ring
          key={index}
          index={index}
          amplitude={amplitude}
          isActive={isActive}
          color={color}
          reduced={reduced}
        />
      ))}
      {children}
    </View>
  );
}
