import { PHOTO, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import * as React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AvatarCrop } from "@/components/chat/AvatarCrop";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Cancel01Icon, Download01Icon, Image01Icon, RefreshIcon, SmileIcon } from "@/lib/icons";
import type { AvatarCropRect } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

export type PhotoAction = "avatar" | "background" | "save" | "regenerate" | "delete";

export interface PhotoViewerProps {
  uri: string | null;
  characterId: string;
  onClose: () => void;
  onAction: (action: PhotoAction) => void;
  onCrop: (crop: AvatarCropRect) => void;
  showActions?: boolean;
}

const ACTIONS: { action: PhotoAction; label: string; destructive?: boolean }[] = [
  { action: "avatar", label: "Profile picture" },
  { action: "background", label: "Chat background" },
  { action: "save", label: "Save to device" },
  { action: "regenerate", label: "Regenerate" },
  { action: "delete", label: "Delete", destructive: true },
];

export function PhotoViewer({
  uri,
  characterId,
  onClose,
  onAction,
  onCrop,
  showActions = true,
}: PhotoViewerProps) {
  const [isFraming, setFraming] = React.useState(false);
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = React.useCallback(() => {
    scale.set(1);
    savedScale.set(1);
    offsetX.set(0);
    offsetY.set(0);
    savedX.set(0);
    savedY.set(0);
  }, [scale, savedScale, offsetX, offsetY, savedX, savedY]);

  React.useEffect(() => {
    if (!uri) {
      reset();
      setFraming(false);
    }
  }, [uri, reset]);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.set(Math.min(PHOTO.maxZoom, Math.max(PHOTO.minZoom, savedScale.get() * event.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() <= 1) {
        scale.set(withTiming(1, { duration: UI_MS.disclosure }));
        savedScale.set(1);
        offsetX.set(withTiming(0, { duration: UI_MS.disclosure }));
        offsetY.set(withTiming(0, { duration: UI_MS.disclosure }));
        savedX.set(0);
        savedY.set(0);
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      if (savedScale.get() <= 1) return;
      offsetX.set(savedX.get() + event.translationX);
      offsetY.set(savedY.get() + event.translationY);
    })
    .onEnd(() => {
      savedX.set(offsetX.get());
      savedY.set(offsetY.get());
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = savedScale.get() > 1 ? 1 : PHOTO.doubleTapZoom;
      scale.set(withTiming(next, { duration: UI_MS.disclosure }));
      savedScale.set(next);
      if (next === 1) {
        offsetX.set(withTiming(0, { duration: UI_MS.disclosure }));
        offsetY.set(withTiming(0, { duration: UI_MS.disclosure }));
        savedX.set(0);
        savedY.set(0);
      }
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.get() },
      { translateY: offsetY.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <Modal visible={uri !== null} transparent animationType="none" onRequestClose={onClose}>
      {/* Gestures do not reach into a React Native Modal on their own: the modal
          is a separate native view hierarchy, outside the provider at the app
          root. Without this, pinch and drag silently do nothing in here. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
          className="flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.94)" }}
        >
          {isFraming && uri ? (
            <AvatarCrop
              uri={uri}
              characterId={characterId}
              onCancel={() => setFraming(false)}
              onConfirm={(crop) => {
                setFraming(false);
                onCrop(crop);
              }}
            />
          ) : (
            <>
              <View className="flex-row justify-end px-4 pt-14">
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Close photo"
                  onPress={onClose}
                  className="h-11 w-11 items-center justify-center"
                >
                  <AppIcon
                    icon={Cancel01Icon}
                    size={22}
                    color={theme.textPrimary}
                    strokeWidth={2}
                  />
                </PressableScale>
              </View>

              <GestureDetector gesture={gesture}>
                <Animated.View className="flex-1 items-center justify-center">
                  {uri ? (
                    <Animated.View style={[{ width: "100%", height: "80%" }, imageStyle]}>
                      <Image
                        source={{ uri }}
                        contentFit="contain"
                        cachePolicy="disk"
                        accessibilityRole="image"
                        accessibilityLabel="Photo, pinch to zoom"
                        style={{ width: "100%", height: "100%" }}
                      />
                    </Animated.View>
                  ) : null}
                </Animated.View>
              </GestureDetector>

              <View className="flex-row flex-wrap justify-center gap-2 px-4 pb-12">
                {(showActions ? ACTIONS : []).map((entry) => (
                  <PressableScale
                    key={entry.action}
                    accessibilityRole="button"
                    accessibilityLabel={entry.label}
                    onPress={() =>
                      entry.action === "avatar" ? setFraming(true) : onAction(entry.action)
                    }
                    className="flex-row items-center gap-2 border px-3 py-2"
                    style={{
                      borderRadius: theme.radius,
                      borderColor: entry.destructive ? theme.danger : theme.cardBorder,
                      backgroundColor: theme.card,
                    }}
                  >
                    <AppIcon
                      icon={iconFor(entry.action)}
                      size={16}
                      color={entry.destructive ? theme.danger : theme.textMuted}
                      strokeWidth={2}
                    />
                    <Text
                      className="font-ui text-xs"
                      style={{ color: entry.destructive ? theme.danger : theme.textPrimary }}
                    >
                      {entry.label}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </>
          )}

          <Pressable
            accessibilityLabel="Close photo"
            className="absolute inset-0 -z-10"
            onPress={onClose}
          />
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function iconFor(action: PhotoAction) {
  if (action === "avatar") return SmileIcon;
  if (action === "background") return Image01Icon;
  if (action === "save") return Download01Icon;
  if (action === "regenerate") return RefreshIcon;
  return Cancel01Icon;
}
