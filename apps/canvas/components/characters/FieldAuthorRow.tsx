import { AUTHOR_COPY, UI_MS } from "@eidolon/config";
import { ActivityIndicator, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { MagicWand01Icon, SparklesIcon, Undo02Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface FieldAuthorRowProps {
  characterId?: string;
  label: string;
  hasText: boolean;
  isBusy: boolean;
  isLocked: boolean;
  stepsBack: number;
  onSuggest: () => void;
  onEnhance: () => void;
  onRevert: () => void;
}

const SIZE = 32;

export function FieldAuthorRow({
  characterId,
  label,
  hasText,
  isBusy,
  isLocked,
  stepsBack,
  onSuggest,
  onEnhance,
  onRevert,
}: FieldAuthorRowProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  if (isBusy) {
    return (
      <View style={{ height: SIZE }} className="flex-row items-center justify-center px-2">
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1.5">
      {stepsBack > 0 ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${AUTHOR_COPY.revert}: ${label}`}
            hitSlop={8}
            disabled={isLocked}
            onPress={onRevert}
            style={{ height: SIZE, width: SIZE, opacity: isLocked ? 0.4 : 1 }}
            className="items-center justify-center rounded-button border border-border bg-input"
          >
            <AppIcon icon={Undo02Icon} size={15} color={theme.textMuted} />
          </PressableScale>
        </Animated.View>
      ) : null}

      {hasText ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${AUTHOR_COPY.enhance}: ${label}`}
          hitSlop={8}
          disabled={isLocked}
          onPress={onEnhance}
          style={{ height: SIZE, width: SIZE, opacity: isLocked ? 0.4 : 1 }}
          className="items-center justify-center rounded-button border border-border bg-input"
        >
          <AppIcon icon={MagicWand01Icon} size={15} color={theme.textPrimary} />
        </PressableScale>
      ) : null}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${AUTHOR_COPY.suggest}: ${label}`}
        hitSlop={8}
        disabled={isLocked}
        onPress={onSuggest}
        style={{ height: SIZE, width: SIZE, opacity: isLocked ? 0.4 : 1 }}
        className="items-center justify-center rounded-button border bg-input"
        // The one control that is always offered, so it carries the accent.
        // The others appear only when there is something to act on.
      >
        <AppIcon icon={SparklesIcon} size={15} color={theme.primary} />
      </PressableScale>
    </View>
  );
}
