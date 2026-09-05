import { CHAT, CHAT_MS } from "@eidolon/config";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useResolvedTheme } from "@/store/theme-store";

export interface QuillBeadProps {
  characterId?: string;
}

export function QuillBead({ characterId }: QuillBeadProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: CHAT.beadWidthPx,
          height: CHAT.beadHeightPx,
          borderRadius: CHAT.beadRadiusPx,
          marginLeft: 4,
          alignSelf: "flex-end",
          backgroundColor: theme.primary,
        },
        !reduced && {
          animationName: {
            "0%": { opacity: 1, transform: [{ scaleY: 1 }] },
            "50%": { opacity: 0.35, transform: [{ scaleY: 0.72 }] },
            "100%": { opacity: 1, transform: [{ scaleY: 1 }] },
          },
          animationDuration: CHAT_MS.beadPulse,
          animationIterationCount: "infinite",
          animationTimingFunction: "ease-in-out",
        },
      ]}
    />
  );
}
