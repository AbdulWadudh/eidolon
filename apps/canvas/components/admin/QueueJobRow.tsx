import { DASHBOARD_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { disclose } from "@/components/admin/admin-motion";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { QueueJobInput } from "@/components/admin/QueueJobInput";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { ArrowDown01Icon, ArrowUp01Icon, Delete02Icon, Undo02Icon } from "@/lib/icons";
import type { QueueJobView, QueueState } from "@/store/admin-api";
import { useResolvedTheme } from "@/store/theme-store";

export interface QueueJobRowProps {
  job: QueueJobView;
  expanded: boolean;
  busyField: string | null;
  authorError: string | null;
  authorable: (field: string) => boolean;
  stepsBack: (field: string) => number;
  onToggle: () => void;
  onAuthor: (field: string, mode: "suggest" | "enhance", draft: string) => Promise<string | null>;
  onRevertField: (field: string) => string | null;
  onSave: (patch: Record<string, unknown>, retry: boolean) => void;
  onRetry: () => void;
  onRemove: () => void;
}

function when(at: number | null): string | null {
  return at === null || at === 0 ? null : new Date(at).toLocaleTimeString();
}

export function QueueJobRow({
  job,
  expanded,
  busyField,
  authorError,
  authorable,
  stepsBack,
  onToggle,
  onAuthor,
  onRevertField,
  onSave,
  onRetry,
  onRemove,
}: QueueJobRowProps) {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();

  const stateColour: Record<QueueState, string> = {
    active: theme.primary,
    waiting: theme.textMuted,
    delayed: theme.warning,
    failed: theme.danger,
    completed: theme.success,
  };

  const summary = [
    job.characterId,
    when(job.runAt) ?? when(job.finishedAt),
    job.attemptsMade > 0 ? `try ${job.attemptsMade}` : null,
    job.progress !== null ? `${Math.round(job.progress)}%` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <GlassSurface tint="card" className="overflow-hidden rounded-card border border-border">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={job.name}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="flex-row items-center gap-2 px-3 py-2.5"
      >
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: stateColour[job.state] }}
        />

        <View className="flex-1">
          <Text className="font-ui-medium text-xs text-text-primary" numberOfLines={1}>
            {job.name}
          </Text>
          {summary.length > 0 ? (
            <Text className="mt-0.5 font-ui text-[10px] text-text-muted" numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>

        <Text className="font-ui text-[10px]" style={{ color: stateColour[job.state] }}>
          {job.state}
        </Text>

        <AppIcon
          icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
          size={14}
          color={theme.textMuted}
        />
      </PressableScale>

      {expanded ? (
        <Animated.View entering={disclose(reduced)} className="gap-3 border-border border-t p-3">
          <QueueJobInput
            fields={job.input}
            canEdit={job.state === "failed"}
            authorable={authorable}
            busyField={busyField}
            authorError={authorError}
            stepsBack={stepsBack}
            onAuthor={onAuthor}
            onRevert={onRevertField}
            onSave={onSave}
          />

          {job.output ? (
            <View className="gap-1">
              <Label text="Output" />
              <MediaPreview value={job.output} characterId={job.characterId ?? undefined} />
            </View>
          ) : null}

          {job.failedReason ? (
            <View className="gap-1">
              <Label text="Failure" />
              <Text className="font-ui text-[10px] text-danger">{job.failedReason}</Text>
            </View>
          ) : null}

          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 font-ui text-[10px] text-text-muted" numberOfLines={1}>
              {job.id}
            </Text>

            {job.state === "failed" ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={DASHBOARD_COPY.queueRetry}
                hitSlop={8}
                onPress={onRetry}
                className="h-8 flex-row items-center gap-1.5 rounded-button border border-border px-2.5"
              >
                <AppIcon icon={Undo02Icon} size={13} color={theme.textPrimary} />
                <Text className="font-ui-medium text-[10px] text-text-primary">
                  {DASHBOARD_COPY.queueRetry}
                </Text>
              </PressableScale>
            ) : null}

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={DASHBOARD_COPY.queueRemove}
              hitSlop={8}
              onPress={onRemove}
              className="h-8 flex-row items-center gap-1.5 rounded-button border border-border px-2.5"
            >
              <AppIcon icon={Delete02Icon} size={13} color={theme.danger} />
              <Text className="font-ui-medium text-[10px] text-danger">
                {DASHBOARD_COPY.queueRemove}
              </Text>
            </PressableScale>
          </View>
        </Animated.View>
      ) : null}
    </GlassSurface>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text className="font-ui-bold text-[10px] text-text-muted uppercase tracking-wider">
      {text}
    </Text>
  );
}
