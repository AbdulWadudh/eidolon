import { PHOTO } from "@eidolon/config";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { useResolvedTheme } from "@/store/theme-store";

export interface ChatBackdropProps {
  uri: string | null;
  characterId: string;
}

function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${value}`;
}

// The picture runs edge to edge and the canvas colour is washed back into it at
// the top and bottom. Without that, message bubbles and the dock sit on a
// photograph and the whole screen reads as busy; with it, the picture is still
// there but the ends of the screen settle into the theme.
export function ChatBackdrop({ uri, characterId }: ChatBackdropProps) {
  const theme = useResolvedTheme(characterId);
  if (!uri) return null;

  const fade = [
    withAlpha(theme.canvas, PHOTO.backdropFadeOpacity),
    withAlpha(theme.canvas, PHOTO.backdropFadeMidOpacity),
    withAlpha(theme.canvas, 0),
  ] as const;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Image
        source={{ uri }}
        contentFit="cover"
        cachePolicy="disk"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <LinearGradient
        colors={fade}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${PHOTO.backdropFadePercent}%`,
        }}
      />

      <LinearGradient
        colors={[...fade].reverse() as unknown as readonly [string, string, string]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${PHOTO.backdropFadePercent}%`,
        }}
      />
    </View>
  );
}
