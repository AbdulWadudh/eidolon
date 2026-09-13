import { CONFIRM_COPY, DASHBOARD_COPY } from "@eidolon/config";
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
import { RefreshIcon } from "@/lib/icons";
import {
  type AdminAuditView,
  AdminRequestError,
  type AuditEntry,
  clearAudit,
  fetchAudit,
} from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

function when(at: number): string {
  return new Date(at).toLocaleString();
}

export default function AdminAuditScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, sessionToken } = useConnectionStore();
  const confirmation = useConfirm();

  const [view, setView] = React.useState<AdminAuditView | null>(null);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(
    () =>
      fetchAudit(serverHost, sessionToken)
        .then((body) => {
          setView(body);
          setLoading(false);
        })
        .catch((cause: unknown) => {
          const message = cause instanceof AdminRequestError ? cause.message : "";
          setError(message.length > 0 ? message : DASHBOARD_COPY.failed);
          setLoading(false);
        }),
    [sessionToken, serverHost],
  );

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const wipe = React.useCallback(() => {
    confirmation.ask({
      title: DASHBOARD_COPY.auditClear,
      body: CONFIRM_COPY.resetSettingBody,
      confirmLabel: DASHBOARD_COPY.auditClear,
      onConfirm: () => {
        void clearAudit(serverHost, sessionToken).then(reload);
      },
    });
  }, [confirmation.ask, sessionToken, reload, serverHost]);

  const entries = view?.entries ?? [];

  return (
    <AdminScreen
      title={DASHBOARD_COPY.auditTitle}
      blurb={DASHBOARD_COPY.auditBlurb}
      isLoading={isLoading}
      error={error}
      trailing={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={DASHBOARD_COPY.loading}
          hitSlop={12}
          onPress={() => void reload()}
          className="h-9 w-9 items-center justify-center rounded-button border border-border"
        >
          <AppIcon icon={RefreshIcon} size={15} color={theme.textMuted} />
        </PressableScale>
      }
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 font-ui text-xs text-text-muted">
          {DASHBOARD_COPY.auditRetained(view?.total ?? 0, view?.retain ?? 0)}
        </Text>
        {entries.length > 0 ? (
          <Button variant="secondary" size="sm" onPress={wipe}>
            {DASHBOARD_COPY.auditClear}
          </Button>
        ) : null}
      </View>

      {entries.length === 0 ? (
        <AdminEmpty label={DASHBOARD_COPY.auditEmpty} />
      ) : (
        entries.map((entry, index) => (
          <Animated.View entering={revealAt(index, reduced)} key={entry.id}>
            <AuditRow entry={entry} refusedColor={theme.danger} />
          </Animated.View>
        ))
      )}

      {confirmation.sheet}
    </AdminScreen>
  );
}

function AuditRow({ entry, refusedColor }: { entry: AuditEntry; refusedColor: string }) {
  const refused = entry.status >= 400;

  return (
    <GlassSurface
      tint="card"
      className="overflow-hidden rounded-card border border-border px-4 py-3"
    >
      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-ui-bold text-[11px] text-primary">{entry.method}</Text>
            <Text className="flex-1 font-ui text-xs text-text-primary" numberOfLines={1}>
              {entry.path}
            </Text>
          </View>

          <Text className="mt-1 font-ui text-[11px] text-text-muted" numberOfLines={1}>
            {`${DASHBOARD_COPY.auditBy} ${entry.actorEmail ?? DASHBOARD_COPY.auditAnonymous} · ${when(entry.createdAt)}`}
          </Text>

          {entry.detail ? (
            <Text className="mt-1 font-ui text-[11px] text-text-muted">{entry.detail}</Text>
          ) : null}
        </View>

        <Text
          className="font-ui-bold text-[10px]"
          style={{ color: refused ? refusedColor : undefined }}
        >
          {refused ? `${DASHBOARD_COPY.auditRefused} ${entry.status}` : String(entry.status)}
        </Text>
      </View>
    </GlassSurface>
  );
}
