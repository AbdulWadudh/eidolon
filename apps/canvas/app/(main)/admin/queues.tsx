import { DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { QueueJobRow } from "@/components/admin/QueueJobRow";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { useConfirm } from "@/hooks/use-confirm";
import { useJobAuthor } from "@/hooks/use-job-author";
import { Queue01Icon, RefreshIcon } from "@/lib/icons";
import {
  AdminRequestError,
  editQueueJob,
  fetchQueues,
  type QueueJobView,
  type QueueState,
  type QueueView,
  removeQueueJob,
  retryQueue,
  retryQueueJob,
} from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

const ALL_STATES: QueueState[] = ["active", "waiting", "delayed", "failed", "completed"];
const PENDING_STATES: QueueState[] = ["active", "waiting", "delayed", "failed"];

export default function AdminQueuesScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();
  const confirmation = useConfirm();

  const [queues, setQueues] = React.useState<QueueView[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openQueue, setOpenQueue] = React.useState<string | null>(null);
  const [openJob, setOpenJob] = React.useState<string | null>(null);
  const [stateTab, setStateTab] = React.useState<Record<string, QueueState>>({});
  const jobAuthor = useJobAuthor(serverHost, pairingToken);

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

  const apply = React.useCallback(
    (run: Promise<{ queues: QueueView[] }>) => {
      setError(null);
      run.then((body) => setQueues(body.queues)).catch(report);
    },
    [report],
  );

  const dropJob = React.useCallback(
    (queue: QueueView, job: QueueJobView) => {
      confirmation.ask({
        title: DASHBOARD_COPY.queueRemove,
        body: `${job.name} · ${job.characterId ?? job.id}`,
        confirmLabel: DASHBOARD_COPY.queueRemove,
        onConfirm: () => apply(removeQueueJob(serverHost, pairingToken, queue.key, job.id)),
      });
    },
    [apply, confirmation.ask, pairingToken, serverHost],
  );

  const pending = React.useCallback(
    (queue: QueueView) => PENDING_STATES.reduce((total, state) => total + queue.counts[state], 0),
    [],
  );

  const tabsFor = React.useCallback(
    (queue: QueueView): SegmentedOption<QueueState>[] =>
      ALL_STATES.map((state) => ({ value: state, label: `${state} ${queue.counts[state]}` })),
    [],
  );

  const saveJob = React.useCallback(
    (queue: QueueView, job: QueueJobView, patch: Record<string, unknown>, retry: boolean) => {
      setError(null);
      apply(editQueueJob(serverHost, pairingToken, queue.key, job.id, patch, retry));
      jobAuthor.forget(job.id);
    },
    [apply, jobAuthor.forget, pairingToken, serverHost],
  );

  const visibleJobs = React.useCallback(
    (queue: QueueView) => {
      const state = stateTab[queue.key] ?? "active";
      return queue.jobs.filter((job) => job.state === state);
    },
    [stateTab],
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
        <Animated.View entering={revealAt(index, reduced)} key={queue.key}>
          <CollapsibleSection
            sectionKey={queue.key}
            icon={Queue01Icon}
            iconColor={queue.reachable ? theme.primary : theme.danger}
            title={queue.name}
            badge={
              <Text
                className="font-ui-bold text-[11px]"
                style={{ color: queue.counts.failed > 0 ? theme.danger : theme.primary }}
              >
                {queue.reachable ? pending(queue) : DASHBOARD_COPY.failed}
              </Text>
            }
            expanded={openQueue === queue.key}
            onToggle={(key) => setOpenQueue((prev) => (prev === key ? null : key))}
            chevronColor={theme.textMuted}
            className="rounded-card border border-border bg-card p-3"
          >
            <View className="gap-3">
              <Segmented
                options={tabsFor(queue)}
                value={stateTab[queue.key] ?? "active"}
                onChange={(next) => setStateTab((current) => ({ ...current, [queue.key]: next }))}
                accessibilityLabel={queue.name}
              />

              {queue.counts.failed > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => apply(retryQueue(serverHost, pairingToken, queue.key))}
                >
                  {DASHBOARD_COPY.queueRetryAll}
                </Button>
              ) : null}

              {visibleJobs(queue).length === 0 ? (
                <AdminEmpty label={DASHBOARD_COPY.queuesEmpty} />
              ) : (
                <View className="gap-2">
                  {visibleJobs(queue).map((job) => {
                    const key = `${queue.key}:${job.id}`;

                    return (
                      <QueueJobRow
                        key={key}
                        job={job}
                        expanded={openJob === key}
                        busyField={jobAuthor.busyField}
                        authorError={jobAuthor.error}
                        authorable={jobAuthor.authorable}
                        stepsBack={(field) => jobAuthor.stepsBack(`${job.id}:${field}`)}
                        onToggle={() => setOpenJob((prev) => (prev === key ? null : key))}
                        onAuthor={(field, mode, draft) =>
                          jobAuthor.author(queue.key, job.id, field, mode, draft)
                        }
                        onRevertField={(field) => jobAuthor.revert(job.id, field)}
                        onSave={(patch, retry) => saveJob(queue, job, patch, retry)}
                        onRetry={() =>
                          apply(retryQueueJob(serverHost, pairingToken, queue.key, job.id))
                        }
                        onRemove={() => dropJob(queue, job)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </CollapsibleSection>
        </Animated.View>
      ))}

      {confirmation.sheet}
    </AdminScreen>
  );
}
