import { EASING_BEZIER, PRESS_SCALE, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EASE_OUT = Easing.bezier(...EASING_BEZIER.out);
const PRESS_TIMING = { duration: UI_MS.pressFeedback, easing: EASE_OUT };

export interface PressableScaleProps extends PressableProps {
  className?: string;
  scaleTo?: number;
}

export const PressableScale = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  PressableScaleProps
>(({ scaleTo = PRESS_SCALE, onPressIn, onPressOut, style, disabled, ...props }, ref) => {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      pressRetentionOffset={12}
      onPressIn={(event) => {
        if (!reduced && !disabled) scale.set(withTiming(scaleTo, PRESS_TIMING));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, PRESS_TIMING));
        onPressOut?.(event);
      }}
      style={[animatedStyle, style]}
      {...props}
    />
  );
});

PressableScale.displayName = "PressableScale";
