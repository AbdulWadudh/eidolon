import { GALLERY_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import {
  FlatList,
  type LayoutChangeEvent,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { type GalleryAction, GalleryActions } from "@/components/characters/GalleryActions";
import { ZoomableImage } from "@/components/characters/ZoomableImage";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Cancel01Icon } from "@/lib/icons";
import { savePhotoToDevice } from "@/lib/save-photo";
import { tap } from "@/services/haptics";
import { deletePhoto, saveLook } from "@/store/chat-photos";
import { useChatStore } from "@/store/chat-store";
import { deleteGalleryImage, type GalleryImage, setAvatar } from "@/store/gallery-api";

export interface GalleryViewerProps {
  images: GalleryImage[];
  startIndex: number;
  characterId: string;
  serverHost: string;
  onClose: () => void;
  onOpenChat: (messageId: string) => void;
  onDeleted: (id: string) => void;
  onAvatarChanged: (url: string) => void;
}

export function GalleryViewer({
  images,
  startIndex,
  characterId,
  serverHost,
  onClose,
  onOpenChat,
  onDeleted,
  onAvatarChanged,
}: GalleryViewerProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = React.useState(0);
  const [index, setIndex] = React.useState(startIndex);
  const [note, setNote] = React.useState<string | null>(null);
  // The pager must let go of horizontal swipes while a picture is zoomed in.
  const [isZoomed, setZoomed] = React.useState(false);

  // The list's own scroll, named so the pinch can declare it may run at the same
  // time. Left undeclared the pager wins the touch and nothing zooms.
  const pager = React.useMemo(() => Gesture.Native(), []);

  React.useEffect(() => setIndex(startIndex), [startIndex]);

  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  // Derived from the offset rather than from onViewableItemsChanged, which
  // fires mid-swipe and made the counter flicker between two numbers.
  const onScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      setIndex((current) => (current === next ? current : next));
      setNote(null);
    },
    [width],
  );

  const current = images[index];

  const act = React.useCallback(
    (action: GalleryAction) => {
      if (!current) return;

      if (action === "save") {
        void savePhotoToDevice(current.url).then((result) => {
          tap(result === "saved" ? "success" : "light");
          setNote(result === "saved" ? GALLERY_COPY.saved : GALLERY_COPY.saveFailed);
        });
        return;
      }

      if (action === "chat") {
        useChatStore.getState().focusMessage(current.id);
        onOpenChat(current.id);
        return;
      }

      if (action === "delete") {
        const removal =
          current.kind === "photo"
            ? deletePhoto(serverHost, characterId, current.id).then(() => true)
            : deleteGalleryImage(serverHost, characterId, current.id);

        void removal.then((gone) => {
          if (!gone) {
            setNote(GALLERY_COPY.deleteFailed);
            return;
          }
          tap("medium");
          onDeleted(current.id);
        });
        return;
      }

      // Her profile picture is a pointer at one of these, not a copy of it, so
      // choosing an older portrait is a change of pointer and destroys nothing.
      if (action === "avatar") {
        void setAvatar(serverHost, characterId, current.url).then((ok) => {
          if (!ok) return;
          void saveLook(serverHost, characterId, { avatarUrl: current.url, avatarCrop: null });
          onAvatarChanged(current.url);
        });
        tap("success");
        setNote(GALLERY_COPY.setAsAvatar);
        return;
      }

      const patch = action === "face" ? { faceUrl: current.url } : { backgroundUrl: current.url };

      void saveLook(serverHost, characterId, patch);
      tap("success");
      setNote(action === "face" ? GALLERY_COPY.setAsFace : GALLERY_COPY.setAsBackground);
    },
    [current, serverHost, characterId, onOpenChat, onDeleted, onAvatarChanged],
  );

  // Only a photo she sent lives in the transcript; a portrait or a backdrop has
  // no message to go back to, and nothing to delete from one.
  const base: GalleryAction[] =
    current?.kind === "photo"
      ? ["chat", "avatar", "face", "background", "save", "delete"]
      : ["avatar", "face", "background", "save", "delete"];

  const actions = base.filter((action) => !(action === "avatar" && current?.isAvatar));

  return (
    <Modal
      visible={images.length > 0}
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      {/* Gesture handlers do not cross a Modal boundary: without a root of its
          own inside the modal, every pinch and pan here was swallowed. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1" style={{ backgroundColor: "#000" }} onLayout={onLayout}>
          {width > 0 ? (
            <GestureDetector gesture={pager}>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(image) => image.id}
                initialScrollIndex={startIndex}
                getItemLayout={(_, position) => ({
                  length: width,
                  offset: width * position,
                  index: position,
                })}
                onScroll={onScroll}
                scrollEventThrottle={16}
                scrollEnabled={!isZoomed}
                renderItem={({ item, index: position }) => (
                  <ZoomableImage
                    uri={item.url}
                    width={width}
                    pager={pager}
                    isActive={position === index}
                    accessibilityLabel={item.caption ?? GALLERY_COPY.imageLabel}
                    onZoomChange={setZoomed}
                  />
                )}
              />
            </GestureDetector>
          ) : null}

          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
            className="absolute top-0 right-0 left-0 flex-row items-center gap-3 px-4 pt-14 pb-4"
          >
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={GALLERY_COPY.closeLabel}
              hitSlop={10}
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <AppIcon icon={Cancel01Icon} size={20} color="#fff" />
            </PressableScale>

            <View className="flex-1 items-center">
              <Text className="font-ui-medium text-[13px]" style={{ color: "#fff" }}>
                {GALLERY_COPY.counter
                  .replace("%d", String(Math.min(index + 1, images.length)))
                  .replace("%t", String(images.length))}
              </Text>
            </View>
          </Animated.View>

          <View className="absolute right-0 bottom-0 left-0 pb-8">
            {current?.caption || note ? (
              <Animated.View
                key={note ?? current?.id}
                entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
                className="px-5 pt-4 pb-3"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
              >
                <Text
                  accessibilityLiveRegion={note ? "polite" : "none"}
                  className="font-main text-[14px] leading-5"
                  style={{ color: "#fff" }}
                >
                  {note ?? current?.caption}
                </Text>
              </Animated.View>
            ) : null}

            <View className="pt-3">
              <GalleryActions characterId={characterId} actions={actions} onAction={act} />
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
