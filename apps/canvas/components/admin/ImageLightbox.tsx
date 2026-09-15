import { MEDIA_PREVIEW, MIND_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DownloadButton } from "@/components/admin/DownloadButton";
import { ZoomableImage } from "@/components/characters/ZoomableImage";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Cancel01Icon } from "@/lib/icons";
import { filenameOf } from "@/lib/media-kind";

export interface ImageLightboxProps {
  url: string | null;
  onClose: () => void;
}

export function ImageLightbox({ url, onClose }: ImageLightboxProps) {
  const { width } = useWindowDimensions();
  const stage = Math.max(0, width - MEDIA_PREVIEW.lightboxPaddingPx * 2);
  const reduced = useReducedMotion();
  const pager = React.useMemo(() => Gesture.Native(), []);
  const [isZoomed, setZoomed] = React.useState(false);

  if (url === null) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View className="flex-row items-center gap-3 px-4 py-3">
              <Text
                className="flex-1 font-ui text-[11px]"
                style={{ color: "#fff" }}
                numberOfLines={1}
              >
                {url ? filenameOf(url) : ""}
              </Text>

              {url ? <DownloadButton url={url} /> : null}

              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={MIND_COPY.closeLabel}
                hitSlop={12}
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-button border"
                style={{ borderColor: "rgba(255,255,255,0.25)" }}
              >
                <AppIcon icon={Cancel01Icon} size={16} color="#fff" />
              </PressableScale>
            </View>

            <View className="flex-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={MIND_COPY.closeLabel}
                disabled={isZoomed}
                onPress={onClose}
                style={StyleSheet.absoluteFill}
              />

              <View
                pointerEvents="box-none"
                className="flex-1 items-center justify-center"
                style={{ paddingHorizontal: MEDIA_PREVIEW.lightboxPaddingPx }}
              >
                {url ? (
                  <ZoomableImage
                    uri={url}
                    width={stage}
                    accessibilityLabel={filenameOf(url)}
                    pager={pager}
                    isActive
                    onZoomChange={setZoomed}
                  />
                ) : null}
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
