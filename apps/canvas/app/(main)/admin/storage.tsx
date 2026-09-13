import { DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { StorageBrowser } from "@/components/admin/StorageBrowser";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useConfirm } from "@/hooks/use-confirm";
import { Delete02Icon, HardDriveIcon, RefreshIcon } from "@/lib/icons";
import { AdminRequestError, fetchStorage, type StorageView, sweepStorage } from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

function publicUrlFor(view: StorageView | null, key: string): string {
  const base = view?.publicUrl?.replace(/\/+$/, "") ?? "";
  return base.length > 0 ? `${base}/${key}` : "";
}

function megabytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

export default function AdminStorageScreen() {
  const reduced = useReducedMotion();
  const { serverHost, sessionToken } = useConnectionStore();
  const confirmation = useConfirm();
  const theme = useResolvedTheme();
  const [isSweepOpen, setSweepOpen] = React.useState(false);

  const [view, setView] = React.useState<StorageView | null>(null);
  const [isLoading, setLoading] = React.useState(true);
  const [isWorking, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const report = React.useCallback((cause: unknown) => {
    const message = cause instanceof AdminRequestError ? cause.message : "";
    setError(message.length > 0 ? message : DASHBOARD_COPY.failed);
  }, []);

  const scan = React.useCallback(() => {
    setError(null);
    setWorking(true);
    fetchStorage(serverHost, sessionToken)
      .then(setView)
      .catch(report)
      .finally(() => {
        setWorking(false);
        setLoading(false);
      });
  }, [sessionToken, report, serverHost]);

  React.useEffect(scan, [scan]);

  const sweep = React.useCallback(() => {
    confirmation.ask({
      title: DASHBOARD_COPY.storageSweep,
      body: DASHBOARD_COPY.storageOrphans(view?.orphans.length ?? 0),
      confirmLabel: DASHBOARD_COPY.storageSweep,
      onConfirm: () => {
        setError(null);
        setWorking(true);
        sweepStorage(serverHost, sessionToken)
          .then(setView)
          .catch(report)
          .finally(() => setWorking(false));
      },
    });
  }, [confirmation.ask, sessionToken, report, serverHost, view]);

  const orphans = view?.orphans ?? [];

  return (
    <AdminScreen
      title={DASHBOARD_COPY.storageTitle}
      blurb={DASHBOARD_COPY.storageBlurb}
      isLoading={isLoading}
      error={error}
    >
      <CollapsibleSection
        sectionKey="sweep"
        icon={HardDriveIcon}
        iconColor={view?.connected ? theme.primary : theme.danger}
        title={view?.connected ? view.bucket : DASHBOARD_COPY.storageOffline}
        badge={
          orphans.length > 0 ? (
            <Text className="font-ui-bold text-[11px] text-danger">{orphans.length}</Text>
          ) : null
        }
        expanded={isSweepOpen}
        onToggle={() => setSweepOpen((open) => !open)}
        chevronColor={theme.textMuted}
        className="rounded-card border border-border bg-card p-3"
      >
        <View className="gap-2">
          <View className="gap-0.5">
            {view?.connected ? (
              <>
                <Text className="font-ui text-[11px] text-text-muted">{view.endpoint}</Text>
                <Text className="font-ui text-xs text-text-muted">
                  {DASHBOARD_COPY.storageScanned(view.scanned, view.referenced)}
                </Text>
              </>
            ) : null}
            {view?.skipped === "no-references" ? (
              <Text className="mt-1 font-ui text-xs text-danger">
                {DASHBOARD_COPY.storageNoReferences}
              </Text>
            ) : null}
            {view && view.removed.length > 0 ? (
              <Text className="mt-1 font-ui text-xs text-success">
                {DASHBOARD_COPY.storageFreed(view.removed.length, megabytes(view.freedBytes))}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center justify-end gap-2">
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={DASHBOARD_COPY.storageScan}
              accessibilityState={{ busy: isWorking }}
              disabled={isWorking}
              onPress={scan}
              className="h-8 flex-row items-center gap-1.5 rounded-button border border-border px-3"
              style={{ backgroundColor: theme.inputSurface, opacity: isWorking ? 0.5 : 1 }}
            >
              <AppIcon icon={RefreshIcon} size={13} color={theme.textMuted} />
              <Text className="font-ui-medium text-[11px] text-text-primary">
                {isWorking ? DASHBOARD_COPY.storageScanning : DASHBOARD_COPY.storageScanShort}
              </Text>
            </PressableScale>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={DASHBOARD_COPY.storageSweep}
              disabled={isWorking || orphans.length === 0 || view?.skipped !== null}
              onPress={sweep}
              className="h-8 flex-row items-center gap-1.5 rounded-button px-3"
              style={{
                backgroundColor: theme.danger,
                opacity: isWorking || orphans.length === 0 || view?.skipped !== null ? 0.4 : 1,
              }}
            >
              <AppIcon icon={Delete02Icon} size={13} color={theme.textPrimary} />
              <Text className="font-ui-medium text-[11px] text-text-primary">
                {DASHBOARD_COPY.storageSweepShort}
              </Text>
            </PressableScale>
          </View>

          {orphans.length === 0 ? (
            <Text className="font-ui text-[11px] text-text-muted">
              {DASHBOARD_COPY.storageClean}
            </Text>
          ) : (
            <>
              <Text className="font-ui text-xs text-text-muted">
                {`${DASHBOARD_COPY.storageOrphans(orphans.length)} · ${megabytes(view?.orphanBytes ?? 0)} MB`}
              </Text>
              {orphans.map((object, index) => (
                <Animated.View entering={revealAt(index, reduced)} key={object.key}>
                  <GlassSurface
                    tint="card"
                    className="gap-2 overflow-hidden rounded-card border border-border px-4 py-2.5"
                  >
                    <View className="flex-row items-center gap-3">
                      <Text
                        className="flex-1 font-ui text-[11px] text-text-muted"
                        numberOfLines={1}
                      >
                        {object.key}
                      </Text>
                      <Text className="font-ui-medium text-[10px] text-text-muted">
                        {`${megabytes(object.bytes)} MB`}
                      </Text>
                    </View>

                    {publicUrlFor(view, object.key) ? (
                      <MediaPreview value={publicUrlFor(view, object.key)} />
                    ) : null}
                  </GlassSurface>
                </Animated.View>
              ))}
            </>
          )}
        </View>
      </CollapsibleSection>

      {view?.connected ? (
        <View className="border-border border-t pt-3 pb-6">
          <StorageBrowser serverHost={serverHost} token={sessionToken} onError={setError} />
        </View>
      ) : null}

      {confirmation.sheet}
    </AdminScreen>
  );
}
