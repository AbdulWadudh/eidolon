import { DASHBOARD_COPY } from "@eidolon/config";
import type { QueueState, QueueView } from "@/store/admin-api";

export const PENDING_TAB = "pending";

export type QueueTab = QueueState | typeof PENDING_TAB;

export const QUEUE_TABS: QueueTab[] = [
  PENDING_TAB,
  "active",
  "waiting",
  "delayed",
  "failed",
  "completed",
];

export const QUEUE_TAB_LABELS: Record<QueueTab, string> = {
  pending: DASHBOARD_COPY.queueStatePending,
  active: DASHBOARD_COPY.queueStateActive,
  waiting: DASHBOARD_COPY.queueStateWaiting,
  delayed: DASHBOARD_COPY.queueStateDelayed,
  failed: DASHBOARD_COPY.queueStateFailed,
  completed: DASHBOARD_COPY.queueStateCompleted,
};

export function isPending(state: QueueState): boolean {
  return state !== "completed";
}

export function countFor(queue: QueueView, tab: QueueTab): number {
  if (tab !== PENDING_TAB) return queue.counts[tab];

  return (Object.keys(queue.counts) as QueueState[])
    .filter(isPending)
    .reduce((total, state) => total + queue.counts[state], 0);
}
