import { CHAT, EASING_BEZIER, UI_MS } from "@eidolon/config";
import { Pressable, View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const KNOB = 20;
const INSET = 3;

export interface SwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  characterId?: string;
  disabled?: boolean;
}

export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
  characterId,
  disabled = false,
}: SwitchProps) {
  const theme = useResolvedTheme(characterId);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={{
        top: (CHAT.minTouchTargetPx - TRACK_HEIGHT) / 2,
        bottom: (CHAT.minTouchTargetPx - TRACK_HEIGHT) / 2,
        left: 8,
        right: 8,
      }}
      onPress={() => onValueChange(!value)}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View
        className="justify-center rounded-full border"
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          backgroundColor: value ? theme.primary : theme.inputSurface,
          borderColor: value ? theme.primary : theme.cardBorder,
          transitionProperty: ["backgroundColor", "borderColor"],
          transitionDuration: UI_MS.disclosure,
          transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
        }}
      >
        <Animated.View
          className="rounded-full"
          style={{
            width: KNOB,
            height: KNOB,
            marginLeft: INSET,
            backgroundColor: value ? theme.primaryForeground : theme.textMuted,
            transform: [{ translateX: value ? TRACK_WIDTH - KNOB - INSET * 2 : 0 }],
            transitionProperty: ["transform", "backgroundColor"],
            transitionDuration: UI_MS.disclosure,
            transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

export interface SwitchRowProps extends SwitchProps {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}

export function SwitchRow({ label, hint, children, ...rest }: SwitchRowProps) {
  return (
    <View className="flex-row items-center gap-3 py-1">
      <View className="flex-1">
        <Animated.Text className="font-ui-medium text-sm text-text-primary">{label}</Animated.Text>
        {hint ? (
          <Animated.Text className="mt-0.5 font-ui text-[11px] text-text-muted">
            {hint}
          </Animated.Text>
        ) : null}
        {children}
      </View>
      <Switch {...rest} />
    </View>
  );
}
