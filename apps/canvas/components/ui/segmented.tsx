import { EASING_BEZIER, SEGMENTED, UI_MS } from "@eidolon/config";
import * as React from "react";
import { type LayoutChangeEvent, Pressable, View } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";
import { select } from "@/services/haptics";
import { useResolvedTheme } from "@/store/theme-store";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  characterId?: string;
  accessibilityLabel: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  characterId,
  accessibilityLabel,
}: SegmentedProps<T>) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const [width, setWidth] = React.useState(0);

  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const track = Math.max(0, width - SEGMENTED.padPx * 2);
  const slot = options.length > 0 ? track / options.length : 0;

  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const motion = reduced
    ? {}
    : {
        transitionProperty: ["transform"] as const,
        transitionDuration: UI_MS.disclosure,
        transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
      };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      className="flex-row rounded-button border"
      style={{
        height: SEGMENTED.trackPx,
        padding: SEGMENTED.padPx,
        backgroundColor: theme.inputSurface,
        borderColor: theme.cardBorder,
      }}
    >
      {slot > 0 ? (
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-button"
          style={{
            left: SEGMENTED.padPx,
            top: SEGMENTED.padPx,
            bottom: SEGMENTED.padPx,
            width: slot,
            backgroundColor: theme.primary,
            transform: [{ translateX: index * slot }],
            ...motion,
          }}
        />
      ) : null}

      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isActive }}
            hitSlop={{ top: SEGMENTED.hitSlopPx, bottom: SEGMENTED.hitSlopPx }}
            onPress={() => {
              if (isActive) return;
              select();
              onChange(option.value);
            }}
            style={{ flex: 1 }}
            className="items-center justify-center px-1"
          >
            <Animated.Text
              numberOfLines={1}
              className="font-ui-medium text-[11px]"
              style={{
                color: isActive ? theme.primaryForeground : theme.textMuted,
                includeFontPadding: false,
                textAlignVertical: "center",
                ...(reduced
                  ? {}
                  : {
                      transitionProperty: ["color"] as const,
                      transitionDuration: UI_MS.disclosure,
                      transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
                    }),
              }}
            >
              {option.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}
