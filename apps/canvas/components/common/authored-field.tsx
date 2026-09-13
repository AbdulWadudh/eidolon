import { AUTHOR_COPY, EASING_BEZIER, FIELD_PADDING, UI_MS } from "@eidolon/config";
import { ActivityIndicator, Text, TextInput, type TextInputProps, View } from "react-native";
import Animated, { cubicBezier, FadeIn, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import type { TextAuthor } from "@/hooks/use-text-author";
import { MagicWand01Icon, SparklesIcon, Undo02Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/store/theme-store";

const ACTION_PX = 28;
const ICON_PX = 14;
const GAP_PX = 6;
const EDGE_PX = 6;

export function actionSlotWidth(count: number): number {
  return count * ACTION_PX + Math.max(0, count - 1) * GAP_PX + EDGE_PX * 2;
}

export interface AuthorActionsProps {
  characterId?: string;
  label?: string;
  hasText: boolean;
  isBusy: boolean;
  isLocked?: boolean;
  stepsBack?: number;
  onSuggest: () => void;
  onEnhance: () => void;
  onRevert?: () => void;
}

export function AuthorActions({
  characterId,
  label,
  hasText,
  isBusy,
  isLocked = false,
  stepsBack = 0,
  onSuggest,
  onEnhance,
  onRevert,
}: AuthorActionsProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const named = (action: string) => (label ? `${action}: ${label}` : action);

  if (isBusy) {
    return (
      <View style={{ height: ACTION_PX }} className="flex-row items-center justify-end px-2">
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  const dimmed = isLocked ? 0.4 : 1;

  return (
    <View className="flex-row items-center justify-end" style={{ gap: GAP_PX }}>
      {stepsBack > 0 && onRevert ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={named(AUTHOR_COPY.revert)}
            hitSlop={8}
            disabled={isLocked}
            onPress={onRevert}
            style={{ height: ACTION_PX, width: ACTION_PX, opacity: dimmed }}
            className="items-center justify-center rounded-button border border-border bg-input"
          >
            <AppIcon icon={Undo02Icon} size={ICON_PX} color={theme.textMuted} />
          </PressableScale>
        </Animated.View>
      ) : null}

      {hasText ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={named(AUTHOR_COPY.enhance)}
          hitSlop={8}
          disabled={isLocked}
          onPress={onEnhance}
          style={{ height: ACTION_PX, width: ACTION_PX, opacity: dimmed }}
          className="items-center justify-center rounded-button border border-border bg-input"
        >
          <AppIcon icon={MagicWand01Icon} size={ICON_PX} color={theme.textPrimary} />
        </PressableScale>
      ) : null}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={named(AUTHOR_COPY.suggest)}
        hitSlop={8}
        disabled={isLocked}
        onPress={onSuggest}
        style={{ height: ACTION_PX, width: ACTION_PX, opacity: dimmed }}
        className="items-center justify-center rounded-button border border-border bg-input"
      >
        <AppIcon icon={SparklesIcon} size={ICON_PX} color={theme.primary} />
      </PressableScale>
    </View>
  );
}

export function textAuthorActions(
  author: TextAuthor,
  draft: string,
  onText: (text: string) => void,
): Pick<AuthorActionsProps, "hasText" | "isBusy" | "onSuggest" | "onEnhance"> {
  return {
    hasText: draft.trim().length > 0,
    isBusy: author.isBusy,
    onSuggest: () => author.run("suggest", "", onText),
    onEnhance: () => author.run("enhance", draft, onText),
  };
}

export interface AuthoredFieldProps extends Omit<TextInputProps, "style"> {
  characterId?: string;
  label?: string;
  hint?: string;
  lines?: number;
  minHeight?: number;
  actions: AuthorActionsProps;
  className?: string;
  inputClassName?: string;
}

export function AuthoredField({
  characterId,
  label,
  hint,
  lines = 1,
  minHeight,
  actions,
  className,
  inputClassName,
  value,
  ...input
}: AuthoredFieldProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  const isMultiline = lines > 1;
  const filled = (value ?? "").trim().length > 0;
  const slot = actionSlotWidth(1 + (filled ? 1 : 0) + ((actions.stepsBack ?? 0) > 0 ? 1 : 0));

  return (
    <View className={cn("gap-1.5", className)}>
      {label ? (
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="font-ui-bold text-[12px] text-text-primary">{label}</Text>
            <Animated.View
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: filled ? theme.primary : theme.cardBorder,
                ...(reduced
                  ? {}
                  : {
                      transitionProperty: ["backgroundColor"] as const,
                      transitionDuration: UI_MS.disclosure,
                      transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
                    }),
              }}
            />
          </View>
          {hint ? (
            <Text className="mt-0.5 font-ui text-[10.5px] text-text-muted leading-[14px]">
              {hint}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View className="relative">
        <TextInput
          {...input}
          value={value}
          accessibilityLabel={input.accessibilityLabel ?? label}
          multiline={isMultiline}
          editable={input.editable ?? !actions.isBusy}
          placeholderTextColor={theme.textMuted}
          cursorColor={theme.primary}
          selectionColor={theme.primary}
          textAlignVertical={isMultiline ? "top" : "center"}
          className={cn(
            "w-full rounded-button border border-border bg-input font-main text-[13.5px] text-text-primary leading-5",
            inputClassName,
          )}
          style={{
            minHeight: minHeight ?? (isMultiline ? 44 + lines * 20 : 44),
            paddingLeft: FIELD_PADDING.horizontal,
            paddingTop: isMultiline ? 10 : 0,
            paddingBottom: isMultiline ? ACTION_PX + EDGE_PX * 2 : 0,
            paddingRight: isMultiline ? FIELD_PADDING.horizontal : slot,
            includeFontPadding: false,
            opacity: actions.isBusy ? 0.5 : 1,
          }}
        />

        <View
          className="absolute"
          style={{
            right: EDGE_PX,
            bottom: isMultiline ? EDGE_PX : 0,
            top: isMultiline ? undefined : 0,
            justifyContent: "center",
          }}
        >
          <AuthorActions {...actions} characterId={characterId} label={label} />
        </View>
      </View>
    </View>
  );
}
