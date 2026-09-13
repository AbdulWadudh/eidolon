import { PHOTO } from "@eidolon/config";
import { Image } from "expo-image";
import * as React from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { PressableScale } from "@/components/common/pressable-scale";
import type { AvatarCropRect } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

export interface AvatarCropProps {
  uri: string;
  characterId: string;
  onCancel: () => void;
  onConfirm: (crop: AvatarCropRect) => void;
}

const DIM = "rgba(0,0,0,0.72)";

export function AvatarCrop({ uri, characterId, onCancel, onConfirm }: AvatarCropProps) {
  const theme = useResolvedTheme(characterId);
  const { width, height } = useWindowDimensions();
  const [ratio, setRatio] = React.useState(1);

  const circle = Math.round(width * PHOTO.avatarFrameFraction);

  const fit = Math.min(width / ratio, height);
  const shown = { width: fit * ratio, height: fit };
  const left = (width - shown.width) / 2;
  const top = (height - shown.height) / 2;

  const circleLeft = (width - circle) / 2;
  const circleTop = (height - circle) / 2;
  const half = circle / 2;

  const floorScale = Math.max(
    PHOTO.minZoom,
    circle / Math.max(shown.width, 1),
    circle / Math.max(shown.height, 1),
  );

  const scale = useSharedValue(floorScale);
  const savedScale = useSharedValue(floorScale);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const slack = React.useCallback(
    (drawn: number) => {
      "worklet";
      return Math.max(0, (drawn - circle) / 2);
    },
    [circle],
  );

  const settle = React.useCallback(() => {
    "worklet";
    const next = Math.min(PHOTO.maxZoom, Math.max(floorScale, scale.get()));
    scale.set(next);
    savedScale.set(next);

    const limitX = slack(shown.width * next);
    const limitY = slack(shown.height * next);

    offsetX.set(Math.min(limitX, Math.max(-limitX, offsetX.get())));
    offsetY.set(Math.min(limitY, Math.max(-limitY, offsetY.get())));
    savedX.set(offsetX.get());
    savedY.set(offsetY.get());
  }, [
    floorScale,
    shown.width,
    shown.height,
    slack,
    scale,
    savedScale,
    offsetX,
    offsetY,
    savedX,
    savedY,
  ]);

  React.useEffect(() => settle(), [settle]);

  const pinch = React.useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          scale.set(Math.min(PHOTO.maxZoom, Math.max(floorScale, savedScale.get() * event.scale)));
        })
        .onEnd(() => settle()),
    [scale, savedScale, floorScale, settle],
  );

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .averageTouches(true)
        .onUpdate((event) => {
          const limitX = slack(shown.width * scale.get());
          const limitY = slack(shown.height * scale.get());

          offsetX.set(Math.min(limitX, Math.max(-limitX, savedX.get() + event.translationX)));
          offsetY.set(Math.min(limitY, Math.max(-limitY, savedY.get() + event.translationY)));
        })
        .onEnd(() => settle()),
    [offsetX, offsetY, savedX, savedY, scale, shown.width, shown.height, slack, settle],
  );

  const gesture = React.useMemo(() => Gesture.Simultaneous(pinch, pan), [pinch, pan]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
      { scale: scale.get() },
    ],
  }));

  const confirm = React.useCallback(() => {
    const s = savedScale.get();
    const drawnWidth = shown.width * s;
    const drawnHeight = shown.height * s;

    onConfirm({
      cx: 0.5 - savedX.get() / drawnWidth,
      cy: 0.5 - savedY.get() / drawnHeight,
      widthRatio: drawnWidth / circle,
      heightRatio: drawnHeight / circle,
    });
  }, [shown.width, shown.height, circle, onConfirm, savedScale, savedX, savedY]);

  return (
    <View className="flex-1">
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }} collapsable={false}>
          <Animated.View
            style={[{ position: "absolute", left, top, ...shown }, imageStyle]}
            pointerEvents="none"
          >
            <Image
              source={{ uri }}
              contentFit="fill"
              cachePolicy="disk"
              onLoad={(event) => {
                const source = event.source;
                if (source?.width && source?.height) setRatio(source.width / source.height);
              }}
              accessibilityLabel="Drag and pinch to choose the part of the photo to use"
              style={{ width: "100%", height: "100%" }}
            />
          </Animated.View>

          {}
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, right: 0, top: 0, height: circleTop }}
          >
            <View style={{ flex: 1, backgroundColor: DIM }} />
          </View>
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, right: 0, top: circleTop + circle, bottom: 0 }}
          >
            <View style={{ flex: 1, backgroundColor: DIM }} />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              top: circleTop,
              width: circleLeft,
              height: circle,
              backgroundColor: DIM,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: circleLeft + circle,
              right: 0,
              top: circleTop,
              height: circle,
              backgroundColor: DIM,
            }}
          />

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: circleLeft,
              top: circleTop,
              width: half,
              height: half,
              backgroundColor: DIM,
              borderBottomRightRadius: half,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: circleLeft + half,
              top: circleTop,
              width: half,
              height: half,
              backgroundColor: DIM,
              borderBottomLeftRadius: half,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: circleLeft,
              top: circleTop + half,
              width: half,
              height: half,
              backgroundColor: DIM,
              borderTopRightRadius: half,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: circleLeft + half,
              top: circleTop + half,
              width: half,
              height: half,
              backgroundColor: DIM,
              borderTopLeftRadius: half,
            }}
          />

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: circleLeft,
              top: circleTop,
              width: circle,
              height: circle,
              borderRadius: half,
              borderWidth: 2,
              borderColor: theme.primary,
            }}
          />
        </View>
      </GestureDetector>

      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" }}
        className="pt-16"
      >
        <Text className="font-ui text-text-primary text-xs uppercase tracking-wider">
          Drag and pinch to frame it
        </Text>
      </View>

      <View
        pointerEvents="box-none"
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" }}
        className="gap-3 pb-12"
      >
        <View className="flex-row gap-3">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onCancel}
            className="border border-border px-5 py-2.5"
            style={{ borderRadius: theme.radius, backgroundColor: theme.card }}
          >
            <Text className="font-ui text-sm text-text-primary">Cancel</Text>
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Use this as the profile picture"
            onPress={confirm}
            className="px-5 py-2.5"
            style={{ borderRadius: theme.radius, backgroundColor: theme.primary }}
          >
            <Text className="font-ui-bold text-sm" style={{ color: theme.primaryForeground }}>
              Use this
            </Text>
          </PressableScale>
        </View>

        <Text className="font-ui text-text-muted text-xs">Only the circle is used</Text>
      </View>
    </View>
  );
}
