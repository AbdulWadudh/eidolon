import { GALLERY, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import * as React from "react";
import { View } from "react-native";
import type { NativeGesture } from "react-native-gesture-handler";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export interface ZoomableImageProps {
  uri: string;
  width: number;
  accessibilityLabel: string;
  pager: NativeGesture;
  isActive: boolean;
  onZoomChange: (isZoomed: boolean) => void;
}

export function ZoomableImage({
  uri,
  width,
  accessibilityLabel,
  pager,
  isActive,
  onZoomChange,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const [isZoomed, setZoomed] = React.useState(false);

  const report = React.useCallback(
    (zoomed: boolean) => {
      setZoomed(zoomed);
      onZoomChange(zoomed);
    },
    [onZoomChange],
  );

  React.useEffect(() => {
    if (isActive || !isZoomed) return;

    scale.set(withTiming(1, { duration: UI_MS.disclosure }));
    savedScale.set(1);
    x.set(withTiming(0, { duration: UI_MS.disclosure }));
    y.set(withTiming(0, { duration: UI_MS.disclosure }));
    savedX.set(0);
    savedY.set(0);
    report(false);
  }, [isActive, isZoomed, scale, savedScale, x, y, savedX, savedY, report]);

  const gesture = React.useMemo(() => {
    const pinch = Gesture.Pinch()
      .simultaneousWithExternalGesture(pager)
      .onUpdate((event) => {
        "worklet";
        const next = savedScale.get() * event.scale;
        scale.set(Math.min(GALLERY.maxZoom, Math.max(GALLERY.minZoom, next)));
      })
      .onEnd(() => {
        "worklet";
        const settled = Math.max(GALLERY.minZoom, scale.get());
        scale.set(withTiming(settled, { duration: UI_MS.pressFeedback }));
        savedScale.set(settled);

        if (settled <= GALLERY.minZoom) {
          x.set(withTiming(0));
          y.set(withTiming(0));
          savedX.set(0);
          savedY.set(0);
        }

        scheduleOnRN(report, settled > GALLERY.minZoom + 0.01);
      });

    const pan = Gesture.Pan()
      .averageTouches(true)
      .enabled(isZoomed)
      .simultaneousWithExternalGesture(pager)
      .onUpdate((event) => {
        "worklet";
        x.set(savedX.get() + event.translationX);
        y.set(savedY.get() + event.translationY);
      })
      .onEnd(() => {
        "worklet";
        savedX.set(x.get());
        savedY.set(y.get());
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(GALLERY.doubleTapMs)
      .onEnd(() => {
        "worklet";
        const zoomingIn = savedScale.get() <= GALLERY.minZoom;
        const next = zoomingIn ? GALLERY.doubleTapZoom : GALLERY.minZoom;

        scale.set(withTiming(next, { duration: UI_MS.disclosure }));
        savedScale.set(next);

        if (!zoomingIn) {
          x.set(withTiming(0, { duration: UI_MS.disclosure }));
          y.set(withTiming(0, { duration: UI_MS.disclosure }));
          savedX.set(0);
          savedY.set(0);
        }

        scheduleOnRN(report, zoomingIn);
      });

    return Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [isZoomed, pager, scale, savedScale, x, y, savedX, savedY, report]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width }} className="flex-1 items-center justify-center">
        <Animated.View style={[{ width, height: "100%" }, style]}>
          <Image
            source={{ uri }}
            style={{ width, height: "100%" }}
            contentFit="contain"
            accessibilityLabel={accessibilityLabel}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
