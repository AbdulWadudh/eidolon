import { AUTHOR_COPY, GALLERY_COPY, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { ArrowLeft01Icon, SparklesIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

const PORTRAIT_RATIO = 0.78;

export interface ProfileHeroProps {
  characterId: string;
  name: string;
  subtitle: string;
  avatarUrl: string | null;
  messageCount: number;
  pictureCount: number;
  onBack: () => void;
  onOpenChat: () => void;
  onGeneratePortrait: () => void;
}

function plural(one: string, many: string, count: number): string {
  return count === 1 ? one : many.replace("%d", String(count));
}

export function ProfileHero({
  characterId,
  name,
  subtitle,
  avatarUrl,
  messageCount,
  pictureCount,
  onBack,
  onOpenChat,
  onGeneratePortrait,
}: ProfileHeroProps) {
  const { width } = useWindowDimensions();
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const height = Math.round(width * PORTRAIT_RATIO);

  return (
    <View>
      <View style={{ height, backgroundColor: theme.inputSurface }}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="disk"
            transition={reduced ? 0 : UI_MS.reveal}
            accessibilityLabel={name ? `${name}'s picture` : GALLERY_COPY.imageLabel}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="font-main-bold text-5xl" style={{ color: theme.primary }}>
              {name.trim().slice(0, 1).toUpperCase() || "?"}
            </Text>
          </View>
        )}

        {/* A solid band rather than a gradient: the design system has no blur or
            translucency, and the name has to stay readable over any portrait. */}
        <View
          pointerEvents="none"
          className="absolute right-0 bottom-0 left-0 h-24"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        />

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={AUTHOR_COPY.portraitRegenerate}
          hitSlop={10}
          onPress={onGeneratePortrait}
          className="absolute top-3 right-4 h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <AppIcon icon={SparklesIcon} size={20} color="#fff" />
        </PressableScale>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={GALLERY_COPY.closeLabel}
          hitSlop={10}
          onPress={onBack}
          className="absolute top-3 left-4 h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color="#fff" />
        </PressableScale>

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.reveal)}
          className="absolute right-0 bottom-0 left-0 px-4 pb-4"
        >
          <Text
            className="font-main-bold text-2xl"
            style={{ color: "#fff" }}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {name}
          </Text>
          {subtitle ? (
            <Text
              className="mt-0.5 font-ui text-[12px]"
              style={{ color: "rgba(255,255,255,0.82)" }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>
      </View>

      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-row items-center gap-3 px-4 pt-4"
      >
        <View className="flex-1">
          <Text className="font-ui-medium text-[12px] text-text-primary">
            {plural(GALLERY_COPY.countOne, GALLERY_COPY.countMany, pictureCount)}
          </Text>
          <Text className="mt-0.5 font-ui text-[11px] text-text-muted">
            {plural(GALLERY_COPY.messagesOne, GALLERY_COPY.messagesMany, messageCount)}
          </Text>
        </View>

        <Button variant="default" size="default" onPress={onOpenChat}>
          {GALLERY_COPY.openChat}
        </Button>
      </Animated.View>
    </View>
  );
}
