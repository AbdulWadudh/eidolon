import type { ThemeTokens } from "@eidolon/tokens";
import * as React from "react";
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { BlurView } from "@/components/ui/blur-native";
import {
  blurIntensity,
  blurRadiusPx,
  isTranslucent,
  overlayAlpha,
  surfaceAlpha,
  withAlpha,
} from "@/lib/translucency";
import { useResolvedTheme } from "@/store/theme-store";

export type GlassTint = "card" | "input" | "audioPill" | "canvas";

const TINT_TOKENS = {
  card: "card",
  input: "inputSurface",
  audioPill: "audioPillBg",
  canvas: "canvas",
} as const satisfies Record<GlassTint, keyof ThemeTokens>;

export interface GlassSurfaceProps extends ViewProps {
  tint?: GlassTint;
  characterId?: string;
  overlay?: boolean;
}

export const GlassSurface = React.forwardRef<View, GlassSurfaceProps>(
  ({ tint = "card", characterId, overlay = false, className, style, children, ...props }, ref) => {
    const theme = useResolvedTheme(characterId);
    const baseColor = theme[TINT_TOKENS[tint]];
    const translucent = isTranslucent(theme.translucency);

    const surfaceStyle = React.useMemo<ViewStyle>(() => {
      const alpha = overlay ? overlayAlpha(theme.translucency) : surfaceAlpha(theme.translucency);
      const backgroundColor = withAlpha(baseColor, alpha);
      if (!translucent) return { backgroundColor };
      if (Platform.OS === "web") {
        const filter = `blur(${blurRadiusPx(theme.translucency)}px)`;
        return { backgroundColor, backdropFilter: filter } as ViewStyle;
      }
      return { backgroundColor, overflow: "hidden" };
    }, [baseColor, overlay, theme.translucency, translucent]);

    return (
      <View ref={ref} className={className} style={[surfaceStyle, style]} {...props}>
        {translucent && BlurView ? (
          <BlurView
            pointerEvents="none"
            intensity={blurIntensity(theme.translucency)}
            tint={theme.mode === "light" ? "light" : "dark"}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {children}
      </View>
    );
  },
);

GlassSurface.displayName = "GlassSurface";
