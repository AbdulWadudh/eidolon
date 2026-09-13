import { AUTHOR_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import type { TextAuthor } from "@/hooks/use-text-author";
import { MagicWand01Icon, SparklesIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface AuthorButtonsProps {
  characterId: string;
  author: TextAuthor;
  draft: string;
  onText: (text: string) => void;
}

export function AuthorButtons({ characterId, author, draft, onText }: AuthorButtonsProps) {
  const theme = useResolvedTheme(characterId);
  const canEnhance = draft.trim().length > 0;

  return (
    <View className="flex-row gap-2">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={AUTHOR_COPY.suggest}
        accessibilityState={{ busy: author.isBusy }}
        disabled={author.isBusy}
        onPress={() => author.run("suggest", "", onText)}
        className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-button border border-border"
        style={{ opacity: author.isBusy ? 0.5 : 1 }}
      >
        <AppIcon icon={SparklesIcon} size={14} color={theme.primary} />
        <Text className="font-ui-medium text-[11px]" style={{ color: theme.primary }}>
          {author.isBusy ? AUTHOR_COPY.working : AUTHOR_COPY.suggest}
        </Text>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={AUTHOR_COPY.enhance}
        accessibilityState={{ busy: author.isBusy, disabled: !canEnhance }}
        disabled={author.isBusy || !canEnhance}
        onPress={() => author.run("enhance", draft, onText)}
        className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-button border border-border"
        style={{ opacity: author.isBusy || !canEnhance ? 0.4 : 1 }}
      >
        <AppIcon icon={MagicWand01Icon} size={14} color={theme.textMuted} />
        <Text className="font-ui-medium text-[11px]" style={{ color: theme.textMuted }}>
          {AUTHOR_COPY.enhance}
        </Text>
      </PressableScale>
    </View>
  );
}
