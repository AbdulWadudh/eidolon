import { DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { StorageBrowser } from "@/components/admin/StorageBrowser";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useConfirm } from "@/hooks/use-confirm";
import { HardDriveIcon } from "@/lib/icons";
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
  const { serverHost, pairingToken } = useConnectionStore();
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
    fetchStorage(serverHost, pairingToken)
      .then(setView)
      .catch(report)
      .finally(() => {
        setWorking(false);
        setLoading(false);
      });
  }, [pairingToken, report, serverHost]);

  React.useEffect(scan, [scan]);

  const sweep = React.useCallback(() => {
    confirmation.ask({
      title: DASHBOARD_COPY.storageSweep,
      body: DASHBOARD_COPY.storageOrphans(view?.orphans.length ?? 0),
      confirmLabel: DASHBOARD_COPY.storageSweep,
      onConfirm: () => {
        setError(null);
        setWorking(true);
        sweepStorage(serverHost, pairingToken)
          .then(setView)
          .catch(report)
          .finally(() => setWorking(false));
      },
    });
  }, [confirmation.ask, pairingToken, report, serverHost, view]);

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

          <View className="flex-row items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={isWorking}
              onPress={scan}
            >
              {isWorking ? DASHBOARD_COPY.storageScanning : DASHBOARD_COPY.storageScan}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              disabled={isWorking || orphans.length === 0 || view?.skipped !== null}
              onPress={sweep}
            >
              {DASHBOARD_COPY.storageSweep}
            </Button>
          </View>

          {orphans.length === 0 ? (
            <AdminEmpty label={DASHBOARD_COPY.storageClean} />
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
        <View className="mt-2 border-border border-t pt-4">
          <StorageBrowser serverHost={serverHost} token={pairingToken} onError={setError} />
        </View>
      ) : null}

      {confirmation.sheet}
    </AdminScreen>
  );
}
