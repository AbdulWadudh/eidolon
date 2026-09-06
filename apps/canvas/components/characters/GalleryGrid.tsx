import { GALLERY, GALLERY_COPY, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { Image01Icon, PaintBoardIcon, SmileIcon } from "@/lib/icons";
import type { GalleryImage, GalleryKind } from "@/store/gallery-api";
import { useResolvedTheme } from "@/store/theme-store";

const KIND_ICON = {
  photo: Image01Icon,
  portrait: SmileIcon,
  backdrop: PaintBoardIcon,
} as const;

export interface GalleryGridProps {
  images: GalleryImage[];
  characterId: string;
  horizontalPaddingPx: number;
  onOpen: (index: number) => void;
}

/**
 * Laid out by hand rather than with FlatList numColumns: the page this sits on
 * is already a scroll view, and nesting a second vertical scroller there breaks
 * momentum on Android.
 */
export function GalleryGrid({
  images,
  characterId,
  horizontalPaddingPx,
  onOpen,
}: GalleryGridProps) {
  const { width } = useWindowDimensions();
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  const available = width - horizontalPaddingPx * 2 - GALLERY.gapPx * (GALLERY.columns - 1);
  const size = Math.floor(available / GALLERY.columns);

  return (
    <View className="flex-row flex-wrap" style={{ gap: GALLERY.gapPx }}>
      {images.map((image, index) => (
        <Pressable
          key={image.id}
          accessibilityRole="imagebutton"
          accessibilityLabel={image.caption ?? GALLERY_COPY.imageLabel}
          onPress={() => onOpen(index)}
          style={{ width: size, height: size }}
        >
          <Animated.View
            entering={
              reduced
                ? undefined
                : FadeIn.duration(UI_MS.disclosure).delay(
                    Math.min(index, GALLERY.columns * 3) * (UI_MS.revealStagger / 2),
                  )
            }
            className="flex-1 overflow-hidden rounded-sm"
            style={{ backgroundColor: theme.inputSurface }}
          >
            <Image
              source={{ uri: image.url }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={reduced ? 0 : UI_MS.disclosure}
              recyclingKey={image.id}
            />

            {image.kind === "photo" ? null : (
              <View
                pointerEvents="none"
                className="absolute top-1 right-1 h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              >
                <AppIcon icon={KIND_ICON[image.kind as GalleryKind]} size={11} color="#fff" />
              </View>
            )}
          </Animated.View>
        </Pressable>
      ))}
    </View>
  );
}
