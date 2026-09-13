import { DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useConfirm } from "@/hooks/use-confirm";
import { Delete02Icon, RefreshIcon, Undo02Icon } from "@/lib/icons";
import {
  AdminRequestError,
  fetchQueues,
  type QueueJobView,
  type QueueView,
  removeQueueJob,
  retryQueue,
  retryQueueJob,
} from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

const SHOWN_STATES = ["active", "waiting", "delayed", "failed"] as const;

function when(at: number | null): string {
  return at === null ? "" : new Date(at).toLocaleTimeString();
}

export default function AdminQueuesScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();
  const confirmation = useConfirm();

  const [queues, setQueues] = React.useState<QueueView[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const report = React.useCallback((cause: unknown) => {
    const message = cause instanceof AdminRequestError ? cause.message : "";
    setError(message.length > 0 ? message : DASHBOARD_COPY.failed);
  }, []);

  const reload = React.useCallback(() => {
    fetchQueues(serverHost, pairingToken)
      .then((body) => {
        setQueues(body.queues);
        setLoading(false);
      })
      .catch((cause) => {
        report(cause);
        setLoading(false);
      });
  }, [pairingToken, report, serverHost]);

  React.useEffect(reload, [reload]);

  const retryAll = React.useCallback(
    (queue: QueueView) => {
      setError(null);
      retryQueue(serverHost, pairingToken, queue.key)
        .then((body) => setQueues(body.queues))
        .catch(report);
    },
    [pairingToken, report, serverHost],
  );

  const retryOne = React.useCallback(
    (queue: QueueView, job: QueueJobView) => {
      setError(null);
      retryQueueJob(serverHost, pairingToken, queue.key, job.id)
        .then((body) => setQueues(body.queues))
        .catch(report);
    },
    [pairingToken, report, serverHost],
  );

  const dropOne = React.useCallback(
    (queue: QueueView, job: QueueJobView) => {
      confirmation.ask({
        title: DASHBOARD_COPY.queueRemove,
        body: `${job.name} · ${job.characterId ?? job.id}`,
        confirmLabel: DASHBOARD_COPY.queueRemove,
        onConfirm: () => {
          setError(null);
          removeQueueJob(serverHost, pairingToken, queue.key, job.id)
            .then((body) => setQueues(body.queues))
            .catch(report);
        },
      });
    },
    [confirmation.ask, pairingToken, report, serverHost],
  );

  return (
    <AdminScreen
      title={DASHBOARD_COPY.queuesTitle}
      blurb={DASHBOARD_COPY.queuesBlurb}
      isLoading={isLoading}
      error={error}
      trailing={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={DASHBOARD_COPY.loading}
          hitSlop={12}
          onPress={reload}
          className="h-9 w-9 items-center justify-center rounded-full border border-border"
        >
          <AppIcon icon={RefreshIcon} size={15} color={theme.textMuted} />
        </PressableScale>
      }
    >
      {queues.map((queue, index) => (
        <Animated.View entering={revealAt(index, reduced)} key={queue.key} className="gap-2">
          <GlassSurface
            tint="card"
            className="gap-2 overflow-hidden rounded-card border border-border p-4"
          >
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 font-main-bold text-sm text-text-primary">{queue.name}</Text>
              {queue.reachable ? null : (
                <Text className="font-ui text-[11px] text-danger">{DASHBOARD_COPY.failed}</Text>
              )}
            </View>

            <View className="flex-row flex-wrap gap-3">
              {SHOWN_STATES.map((state) => (
                <View className="flex-row items-center gap-1.5" key={state}>
                  <Text
                    className="font-ui-bold text-xs"
                    style={{ color: state === "failed" ? theme.danger : theme.primary }}
                  >
                    {queue.counts[state]}
                  </Text>
                  <Text className="font-ui text-[11px] text-text-muted">{state}</Text>
                </View>
              ))}
            </View>

            {queue.counts.failed > 0 ? (
              <Button variant="secondary" size="sm" onPress={() => retryAll(queue)}>
                {DASHBOARD_COPY.queueRetryAll}
              </Button>
            ) : null}
          </GlassSurface>

          {queue.jobs.length === 0 ? (
            <AdminEmpty label={DASHBOARD_COPY.queuesEmpty} />
          ) : (
            queue.jobs.map((job) => (
              <GlassSurface
                key={`${queue.key}:${job.id}`}
                tint="card"
                className="flex-row items-center gap-2 overflow-hidden rounded-card border border-border px-4 py-2.5"
              >
                <View className="flex-1">
                  <Text className="font-ui-medium text-xs text-text-primary" numberOfLines={1}>
                    {job.name}
                  </Text>
                  <Text className="mt-0.5 font-ui text-[11px] text-text-muted" numberOfLines={1}>
                    {[
                      job.state,
                      job.characterId,
                      job.runAt ? when(job.runAt) : null,
                      job.attemptsMade > 0 ? `try ${job.attemptsMade}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {job.failedReason ? (
                    <Text className="mt-0.5 font-ui text-[11px] text-danger" numberOfLines={2}>
                      {job.failedReason}
                    </Text>
                  ) : null}
                </View>

                {job.state === "failed" ? (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={DASHBOARD_COPY.queueRetry}
                    hitSlop={8}
                    onPress={() => retryOne(queue, job)}
                    className="h-8 w-8 items-center justify-center rounded-button border border-border"
                  >
                    <AppIcon icon={Undo02Icon} size={14} color={theme.textPrimary} />
                  </PressableScale>
                ) : null}

                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={DASHBOARD_COPY.queueRemove}
                  hitSlop={8}
                  onPress={() => dropOne(queue, job)}
                  className="h-8 w-8 items-center justify-center rounded-button border border-border"
                >
                  <AppIcon icon={Delete02Icon} size={14} color={theme.danger} />
                </PressableScale>
              </GlassSurface>
            ))
          )}
        </Animated.View>
      ))}

      {confirmation.sheet}
    </AdminScreen>
  );
}
