import { CONFIRM_COPY, DASHBOARD_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { disclose } from "@/components/admin/admin-motion";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useConfirm } from "@/hooks/use-confirm";
import { ArrowDown01Icon, ArrowUp01Icon, Delete02Icon, Undo02Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export type SaveState = "idle" | "saving" | "saved";

export interface EditableRowProps {
  title: string;
  leading?: React.ReactNode;
  subtitle?: string;
  badge?: string | null;
  expanded: boolean;
  onToggle: () => void;
  onSave?: () => void;
  onReset?: () => void;
  onRemove?: () => void;
  saveState?: SaveState;
  canSave?: boolean;
  removeTitle?: string;
  removeBody?: string;
  resetTitle?: string;
  resetBody?: string;
  children?: React.ReactNode;
}

export function useSaveState(): [SaveState, (run: () => Promise<unknown>) => Promise<void>] {
  const [state, setState] = React.useState<SaveState>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const run = React.useCallback(async (task: () => Promise<unknown>) => {
    setState("saving");
    try {
      await task();
      setState("saved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), UI_MS.saveConfirm);
    } catch (error) {
      setState("idle");
      throw error;
    }
  }, []);

  return [state, run];
}

function saveLabel(state: SaveState): string {
  if (state === "saving") return DASHBOARD_COPY.saving;
  if (state === "saved") return DASHBOARD_COPY.saved;
  return DASHBOARD_COPY.save;
}

export function EditableRow({
  title,
  leading,
  subtitle,
  badge,
  expanded,
  onToggle,
  onSave,
  onReset,
  onRemove,
  saveState = "idle",
  canSave = true,
  removeTitle,
  removeBody,
  resetTitle,
  resetBody,
  children,
}: EditableRowProps) {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const confirmation = useConfirm();

  const askRemove = React.useCallback(() => {
    if (!onRemove) return;
    confirmation.ask({
      title: removeTitle ?? CONFIRM_COPY.deleteCharacter,
      body: removeBody,
      confirmLabel: DASHBOARD_COPY.remove,
      onConfirm: onRemove,
    });
  }, [confirmation.ask, onRemove, removeTitle, removeBody]);

  const askReset = React.useCallback(() => {
    if (!onReset) return;
    confirmation.ask({
      title: resetTitle ?? CONFIRM_COPY.resetSetting,
      body: resetBody ?? CONFIRM_COPY.resetSettingBody,
      confirmLabel: DASHBOARD_COPY.reset,
      onConfirm: onReset,
    });
  }, [confirmation.ask, onReset, resetTitle, resetBody]);

  return (
    <GlassSurface tint="card" className="overflow-hidden rounded-card border border-border">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="flex-row items-center gap-3 px-4 py-3"
      >
        {leading}

        <View className="flex-1">
          <Text className="font-ui-medium text-sm text-text-primary" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="mt-0.5 font-ui text-[11px] text-text-muted leading-4"
              numberOfLines={expanded ? undefined : 2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {badge ? (
          <View className="rounded-button border border-primary/40 px-2 py-0.5">
            <Text className="font-ui-medium text-[10px] text-primary">{badge}</Text>
          </View>
        ) : null}

        <AppIcon
          icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
          size={16}
          color={theme.textMuted}
        />
      </PressableScale>

      {expanded ? (
        <Animated.View entering={disclose(reduced)} className="gap-3 border-border border-t p-4">
          {children}

          <View className="flex-row items-center justify-end gap-2">
            {onRemove ? (
              <Button
                variant="ghost"
                size="sm"
                className="flex-row gap-1.5"
                accessibilityLabel={DASHBOARD_COPY.remove}
                onPress={askRemove}
              >
                <AppIcon icon={Delete02Icon} size={14} color={theme.danger} />
                <Text className="font-ui-medium text-xs text-danger">{DASHBOARD_COPY.remove}</Text>
              </Button>
            ) : null}

            {onReset ? (
              <Button
                variant="secondary"
                size="sm"
                className="flex-row gap-1.5"
                accessibilityLabel={DASHBOARD_COPY.reset}
                onPress={askReset}
              >
                <AppIcon icon={Undo02Icon} size={14} color={theme.textMuted} />
                <Text className="font-ui-medium text-xs text-secondary-foreground">
                  {DASHBOARD_COPY.reset}
                </Text>
              </Button>
            ) : null}

            {onSave ? (
              <Button
                variant="default"
                size="sm"
                disabled={!canSave || saveState === "saving"}
                accessibilityLabel={DASHBOARD_COPY.save}
                onPress={onSave}
              >
                {saveLabel(saveState)}
              </Button>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      {confirmation.sheet}
    </GlassSurface>
  );
}
