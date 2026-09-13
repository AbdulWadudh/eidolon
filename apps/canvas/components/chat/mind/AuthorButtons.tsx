import { AUTHOR_COPY } from "@eidolon/config";
import { ActivityIndicator, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import type { TextAuthor } from "@/hooks/use-text-author";
import { MagicWand01Icon, SparklesIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface AuthorButtonsProps {
  characterId?: string;
  author: TextAuthor;
  draft: string;
  onText: (text: string) => void;
}

const SIZE = 28;
const ICON_PX = 14;

export function AuthorButtons({ characterId, author, draft, onText }: AuthorButtonsProps) {
  const theme = useResolvedTheme(characterId);
  const canEnhance = draft.trim().length > 0;

  if (author.isBusy) {
    return (
      <View style={{ height: SIZE }} className="flex-row items-center justify-end px-2">
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-end gap-1.5">
      {canEnhance ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={AUTHOR_COPY.enhance}
          hitSlop={8}
          onPress={() => author.run("enhance", draft, onText)}
          style={{ height: SIZE, width: SIZE }}
          className="items-center justify-center rounded-button border border-border bg-input"
        >
          <AppIcon icon={MagicWand01Icon} size={ICON_PX} color={theme.textPrimary} />
        </PressableScale>
      ) : null}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={AUTHOR_COPY.suggest}
        hitSlop={8}
        onPress={() => author.run("suggest", "", onText)}
        style={{ height: SIZE, width: SIZE }}
        className="items-center justify-center rounded-button border border-border bg-input"
      >
        <AppIcon icon={SparklesIcon} size={ICON_PX} color={theme.primary} />
      </PressableScale>
    </View>
  );
}
