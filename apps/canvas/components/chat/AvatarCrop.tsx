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

export function AvatarCrop({ uri, characterId, onCancel, onConfirm }: AvatarCropProps) {
  const theme = useResolvedTheme(characterId);
  const { width, height } = useWindowDimensions();

  const side = width;
  const circle = Math.round(width * PHOTO.avatarFrameFraction);
  const imageTop = (height - side) / 2;

  // The dimming is one view with a circular hole rather than a second copy of
  // the image clipped to a circle. Android does not reliably clip a transformed
  // child to a rounded parent — the clipped copy renders in full, over
  // everything — so the picture is drawn once and masked instead.
  //
  // A border thicker than the screen, on a box with a fully round radius,
  // leaves a transparent disc in the middle and covers everything outside it.
  const ring = Math.max(width, height);
  const holeBox = circle + ring * 2;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.set(Math.min(PHOTO.maxZoom, Math.max(PHOTO.minZoom, savedScale.get() * event.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      offsetX.set(savedX.get() + event.translationX);
      offsetY.set(savedY.get() + event.translationY);
    })
    .onEnd(() => {
      savedX.set(offsetX.get());
      savedY.set(offsetY.get());
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
      { scale: scale.get() },
    ],
  }));

  // The crop is saved against the circle, not the screen. The avatar fills its
  // container edge to edge while the ring only ever framed part of a picture
  // drawn `side` wide, so zoom carries that ratio.
  const confirm = React.useCallback(() => {
    onConfirm({
      zoom: (side / circle) * savedScale.get(),
      offsetX: savedX.get() / circle,
      offsetY: savedY.get() / circle,
    });
  }, [side, circle, onConfirm, savedScale, savedX, savedY]);

  return (
    <View className="flex-1">
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <Animated.View
            style={[
              { position: "absolute", top: imageTop, left: 0, width: side, height: side },
              imageStyle,
            ]}
          >
            <Image
              source={{ uri }}
              contentFit="cover"
              cachePolicy="disk"
              accessibilityLabel="Drag and pinch to choose the part of the photo to use"
              style={{ width: "100%", height: "100%" }}
            />
          </Animated.View>

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (width - holeBox) / 2,
              top: (height - holeBox) / 2,
              width: holeBox,
              height: holeBox,
              borderRadius: holeBox / 2,
              borderWidth: ring,
              borderColor: "rgba(0,0,0,0.72)",
            }}
          />

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (width - circle) / 2,
              top: (height - circle) / 2,
              width: circle,
              height: circle,
              borderRadius: circle / 2,
              borderWidth: 2,
              borderColor: theme.primary,
            }}
          />
        </View>
      </GestureDetector>

      <View className="items-center pt-16" pointerEvents="none">
        <Text className="font-ui text-text-primary text-xs uppercase tracking-wider">
          Drag and pinch to frame it
        </Text>
      </View>

      <View className="flex-1" pointerEvents="box-none" />

      <View className="items-center gap-3 pb-12">
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
