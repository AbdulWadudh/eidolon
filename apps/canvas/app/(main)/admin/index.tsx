import { DASHBOARD_COPY } from "@eidolon/config";
import type { IconSvgElement } from "@hugeicons/react-native";
import { type Href, useRouter } from "expo-router";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import {
  ArrowRight01Icon,
  Book02Icon,
  PaintBoardIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  UserMultiple02Icon,
} from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

interface Tile {
  href: Href;
  icon: IconSvgElement;
  title: string;
  blurb: string;
}

const TILES: Tile[] = [
  {
    href: "/(main)/admin/prompts",
    icon: Book02Icon,
    title: DASHBOARD_COPY.promptsTitle,
    blurb: DASHBOARD_COPY.promptsBlurb,
  },
  {
    href: "/(main)/admin/characters",
    icon: SparklesIcon,
    title: DASHBOARD_COPY.charactersTitle,
    blurb: DASHBOARD_COPY.charactersBlurb,
  },
  {
    href: "/(main)/admin/users",
    icon: UserMultiple02Icon,
    title: DASHBOARD_COPY.usersTitle,
    blurb: DASHBOARD_COPY.usersBlurb,
  },
  {
    href: "/(main)/admin/config",
    icon: SlidersHorizontalIcon,
    title: DASHBOARD_COPY.configTitle,
    blurb: DASHBOARD_COPY.configBlurb,
  },
  {
    href: "/(main)/admin/theme",
    icon: PaintBoardIcon,
    title: DASHBOARD_COPY.themeTitle,
    blurb: DASHBOARD_COPY.themeBlurb,
  },
];

export default function AdminHubScreen() {
  const router = useRouter();
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();

  return (
    <AdminScreen title={DASHBOARD_COPY.title} blurb={DASHBOARD_COPY.blurb}>
      {TILES.map((tile, index) => (
        <Animated.View entering={revealAt(index, reduced)} key={tile.title}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={tile.title}
            onPress={() => router.push(tile.href)}
          >
            <GlassSurface
              tint="card"
              className="flex-row items-center gap-3 overflow-hidden rounded-card border border-border p-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full border border-border">
                <AppIcon icon={tile.icon} size={18} color={theme.primary} />
              </View>

              <View className="flex-1">
                <Text className="font-main-bold text-sm text-text-primary">{tile.title}</Text>
                <Text className="mt-0.5 font-ui text-xs text-text-muted leading-4">
                  {tile.blurb}
                </Text>
              </View>

              <AppIcon icon={ArrowRight01Icon} size={16} color={theme.textMuted} />
            </GlassSurface>
          </PressableScale>
        </Animated.View>
      ))}
    </AdminScreen>
  );
}
