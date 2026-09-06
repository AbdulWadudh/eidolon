import { CHARACTER_COPY, EASING_BEZIER, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { croppedStyle, usableCrop } from "@/lib/avatar-crop";
import { ArrowLeft01Icon, Moon02Icon, PaintBoardIcon, Sun02Icon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import type { AvatarCropRect } from "@/store/chat-photos";
import { useResolvedTheme, useThemeStore } from "@/store/theme-store";

const AVATAR_PX = 44;

export interface CharacterSettingsHeaderProps {
  characterId: string;
  name: string;
  ownerNote: string;
  avatarUrl: string | null;
  avatarCrop: AvatarCropRect | null;
  onBack: () => void;
  onOpenTheme: () => void;
}

export function CharacterSettingsHeader({
  characterId,
  name,
  ownerNote,
  avatarUrl,
  avatarCrop,
  onBack,
  onOpenTheme,
}: CharacterSettingsHeaderProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const mode = useThemeStore((state) => state.palettes.mode);
  const toggleColorMode = useThemeStore((state) => state.toggleColorMode);
  const isDark = mode === "dark";
  const crop = usableCrop(avatarCrop);

  const swap = reduced
    ? {}
    : {
        transitionProperty: ["transform", "opacity"] as const,
        transitionDuration: UI_MS.disclosure,
        transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
      };

  return (
    <View className="flex-row items-center gap-3 border-border border-b px-5 py-3">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={CHARACTER_COPY.backLabel}
        hitSlop={8}
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-button border border-border bg-input"
      >
        <AppIcon icon={ArrowLeft01Icon} size={20} color={theme.textPrimary} />
      </PressableScale>

      <View
        className="overflow-hidden rounded-full border border-border bg-input"
        style={{ width: AVATAR_PX, height: AVATAR_PX }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            contentFit={crop ? "fill" : "cover"}
            style={crop ? croppedStyle(crop, AVATAR_PX) : { flex: 1 }}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="font-main-bold text-base" style={{ color: theme.primary }}>
              {name.trim().slice(0, 1).toUpperCase() || "?"}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text className="font-main-bold text-base text-text-primary" numberOfLines={1}>
          {name || CHARACTER_COPY.editTitle}
        </Text>
        <Text className="mt-0.5 font-ui text-[11px] text-text-muted" numberOfLines={1}>
          {ownerNote}
        </Text>
      </View>

      <PressableScale
        accessibilityRole="switch"
        accessibilityState={{ checked: isDark }}
        accessibilityLabel={isDark ? CHARACTER_COPY.lightLabel : CHARACTER_COPY.darkLabel}
        hitSlop={8}
        onPress={() => {
          tap("light");
          toggleColorMode();
        }}
        className="h-11 w-11 items-center justify-center overflow-hidden rounded-button border border-border bg-input"
      >
        {/* Both glyphs stay mounted and cross-rotate, so the swap reads as one
            control turning rather than two icons replacing each other. */}
        <Animated.View
          className="absolute"
          style={{
            opacity: isDark ? 0 : 1,
            transform: [{ rotate: isDark ? "-90deg" : "0deg" }],
            ...swap,
          }}
        >
          <AppIcon icon={Sun02Icon} size={19} color={theme.textPrimary} />
        </Animated.View>
        <Animated.View
          className="absolute"
          style={{
            opacity: isDark ? 1 : 0,
            transform: [{ rotate: isDark ? "0deg" : "90deg" }],
            ...swap,
          }}
        >
          <AppIcon icon={Moon02Icon} size={19} color={theme.primary} />
        </Animated.View>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={CHARACTER_COPY.themeLabel}
        hitSlop={8}
        onPress={onOpenTheme}
        className="h-11 w-11 items-center justify-center rounded-button border bg-input"
        style={{ borderColor: theme.primary }}
      >
        <AppIcon icon={PaintBoardIcon} size={19} color={theme.primary} />
      </PressableScale>
    </View>
  );
}
