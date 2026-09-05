import * as React from "react";
import { type GestureResponderEvent, Platform, View } from "react-native";

export interface RangeSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  accentColor?: string;
  onChange: (val: number) => void;
  className?: string;
}

export function RangeSlider({
  value,
  min = 0,
  max = 40,
  step = 1,
  accentColor = "var(--primary, #F59E0B)",
  onChange,
  className,
}: RangeSliderProps) {
  const [trackWidth, setTrackWidth] = React.useState(200);

  if (Platform.OS === "web") {
    return (
      <View className={className} style={{ width: "100%", justifyContent: "center" }}>
        {React.createElement("input", {
          type: "range",
          min,
          max,
          step,
          value,
          onChange: (e: { target: { value: string } }) => onChange(Number(e.target.value)),
          style: {
            width: "100%",
            height: 32,
            accentColor,
            cursor: "pointer",
            background: "transparent",
          },
        })}
      </View>
    );
  }

  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const handlePress = (e: GestureResponderEvent) => {
    if (trackWidth <= 0) return;
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    const rawVal = min + ratio * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    onChange(Math.max(min, Math.min(max, steppedVal)));
  };

  return (
    <View
      className={className}
      style={{ width: "100%", height: 36, justifyContent: "center" }}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      onTouchStart={handlePress}
      onTouchMove={handlePress}
    >
      <View className="h-2 w-full rounded-full bg-input">
        <View
          style={{ width: `${percent}%`, backgroundColor: accentColor }}
          className="h-full rounded-full"
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: `${percent}%`,
          marginLeft: -10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: accentColor,
          borderColor: "#FFFFFF",
          borderWidth: 2,
        }}
      />
    </View>
  );
}
