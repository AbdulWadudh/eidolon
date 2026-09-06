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
  const { width } = useWindowDimensions();
  const frame = Math.round(width * PHOTO.avatarFrameFraction);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.set(Math.min(PHOTO.maxZoom, Math.max(1, savedScale.get() * event.scale)));
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

  const confirm = React.useCallback(() => {
    const zoom = savedScale.get();
    onConfirm({
      zoom,
      offsetX: savedX.get() / frame,
      offsetY: savedY.get() / frame,
    });
  }, [frame, onConfirm, savedScale, savedX, savedY]);

  return (
    <View className="flex-1 items-center justify-center gap-6 px-6">
      <Text className="font-ui text-text-muted text-xs uppercase tracking-wider">
        Drag and pinch to frame it
      </Text>

      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
        <View
          className="overflow-hidden border-2 border-primary"
          style={{ width: frame, height: frame, borderRadius: frame / 2 }}
        >
          <Animated.View style={[{ width: "100%", height: "100%" }, imageStyle]}>
            <Image
              source={{ uri }}
              contentFit="cover"
              cachePolicy="disk"
              accessibilityLabel="Choose the part of the photo to use"
              style={{ width: "100%", height: "100%" }}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      <View className="flex-row gap-3">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={onCancel}
          className="border border-border px-4 py-2"
          style={{ borderRadius: theme.radius, backgroundColor: theme.card }}
        >
          <Text className="font-ui text-sm text-text-primary">Cancel</Text>
        </PressableScale>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Use this as the profile picture"
          onPress={confirm}
          className="px-4 py-2"
          style={{ borderRadius: theme.radius, backgroundColor: theme.primary }}
        >
          <Text className="font-ui-bold text-sm" style={{ color: theme.primaryForeground }}>
            Use this
          </Text>
        </PressableScale>
      </View>

      <Text className="font-ui text-text-muted text-xs">Only the circle is used</Text>
    </View>
  );
}
