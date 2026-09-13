import { DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { RefreshIcon } from "@/lib/icons";
import { AdminRequestError, fetchHealth, type HealthView } from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

function uptimeLabel(seconds: number): string {
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function AdminHealthScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();

  const [view, setView] = React.useState<HealthView | null>(null);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    fetchHealth(serverHost, pairingToken)
      .then((body) => {
        setView(body);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        const message = cause instanceof AdminRequestError ? cause.message : "";
        setError(message.length > 0 ? message : DASHBOARD_COPY.failed);
        setLoading(false);
      });
  }, [pairingToken, serverHost]);

  React.useEffect(reload, [reload]);

  const colourFor = React.useCallback(
    (state: string) => {
      if (state === "healthy" || state === "connected") return theme.success;
      if (state === "unconfigured") return theme.textMuted;
      return theme.danger;
    },
    [theme],
  );

  const services = Object.entries(view?.services ?? {});

  return (
    <AdminScreen
      title={DASHBOARD_COPY.healthTitle}
      blurb={DASHBOARD_COPY.healthBlurb}
      isLoading={isLoading}
      error={error}
      trailing={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={DASHBOARD_COPY.loading}
          hitSlop={12}
          onPress={reload}
          className="h-9 w-9 items-center justify-center rounded-button border border-border"
        >
          <AppIcon icon={RefreshIcon} size={15} color={theme.textMuted} />
        </PressableScale>
      }
    >
      {services.map(([name, state], index) => {
        const detail = view?.details[name];

        return (
          <Animated.View entering={revealAt(index, reduced)} key={name}>
            <GlassSurface
              tint="card"
              className="gap-2 overflow-hidden rounded-card border border-border px-4 py-3"
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colourFor(state) }}
                />
                <Text className="flex-1 font-ui-medium text-sm text-text-primary">{name}</Text>
                <Text className="font-ui text-[11px]" style={{ color: colourFor(state) }}>
                  {state}
                </Text>
              </View>

              {detail ? (
                <View className="gap-0.5 pl-[22px]">
                  {detail.using ? (
                    <Text className="font-ui-medium text-[11px] text-primary" numberOfLines={1}>
                      {detail.using}
                    </Text>
                  ) : null}
                  {detail.endpoint ? (
                    <Text className="font-ui text-[10px] text-text-muted" numberOfLines={1}>
                      {detail.endpoint}
                    </Text>
                  ) : null}
                  {detail.note ? (
                    <Text className="font-ui text-[10px] text-text-muted" numberOfLines={1}>
                      {detail.note}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </GlassSurface>
          </Animated.View>
        );
      })}

      {view ? (
        <Animated.View entering={revealAt(services.length, reduced)}>
          <GlassSurface
            tint="card"
            className="gap-2 overflow-hidden rounded-card border border-border p-4"
          >
            <Detail label="Conductor" value={`${view.status} · ${view.version}`} />
            <Detail label="Uptime" value={uptimeLabel(view.uptime)} />
            <Detail
              label="Storage"
              value={`${view.storage.status}${view.storage.bucket ? ` · ${view.storage.bucket}` : ""}`}
            />
            <Detail label="Bucket" value={view.details.storage?.endpoint ?? ""} />
            <Detail label="Search" value={view.webSearch.primary} />
            <Detail
              label="Fallbacks"
              value={[
                view.webSearch.hasSerperFallback ? "Serper" : null,
                view.webSearch.hasExaFallback ? "Exa" : null,
              ]
                .filter(Boolean)
                .join(", ")}
            />
            <Detail label="Database" value={view.databaseLocation} />
          </GlassSurface>
        </Animated.View>
      ) : null}
    </AdminScreen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="font-ui text-[11px] text-text-muted">{label}</Text>
      <Text className="flex-1 text-right font-ui-medium text-[11px] text-text-primary">
        {value || "—"}
      </Text>
    </View>
  );
}
