import { CHAT, CHAT_MS } from "@eidolon/config";
import { Image } from "expo-image";
import * as React from "react";
import { View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface MessageImageProps {
  uri: string;
  characterId?: string;
}

export function MessageImage({ uri, characterId }: MessageImageProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <View
      className="w-full overflow-hidden bg-card"
      style={{
        aspectRatio: CHAT.imageAspectRatio,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.cardBorder,
      }}
    >
      <Image
        source={{ uri }}
        contentFit="cover"
        cachePolicy="disk"
        transition={reduced ? 0 : CHAT_MS.imageFade}
        accessibilityRole="image"
        accessibilityLabel="Photo"
        onLoadEnd={() => setIsLoaded(true)}
        style={{ width: "100%", height: "100%" }}
      />
      {isLoaded || reduced ? null : (
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 bg-card"
          style={{
            animationName: { from: { opacity: 0.35 }, to: { opacity: 0.75 } },
            animationDuration: CHAT_MS.shimmer,
            animationIterationCount: "infinite",
            animationDirection: "alternate",
            animationTimingFunction: "ease-in-out",
          }}
        />
      )}
    </View>
  );
}
