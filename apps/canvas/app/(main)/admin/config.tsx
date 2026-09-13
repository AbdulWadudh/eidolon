import { DASHBOARD_COPY } from "@eidolon/config";
import type { ConfigBucket } from "@eidolon/config/registry";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { EditableConfigRow, ReadOnlyConfigRow } from "@/components/admin/ConfigRow";
import { useSaveState } from "@/components/admin/EditableRow";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Input } from "@/components/ui/input";
import { RefreshIcon } from "@/lib/icons";
import {
  AdminRequestError,
  type ConfigSetting,
  type ConfigView,
  fetchConfig,
  reloadConfig,
  resetConfigValue,
  saveConfigValue,
} from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

export default function AdminConfigScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();

  const [view, setView] = React.useState<ConfigView | null>(null);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bucket, setBucket] = React.useState<ConfigBucket | null>(null);
  const [query, setQuery] = React.useState("");
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);
  const [openPath, setOpenPath] = React.useState<string | null>(null);
  const [saveState, runSave] = useSaveState();

  React.useEffect(() => {
    let live = true;

    fetchConfig(serverHost, pairingToken)
      .then((body) => {
        if (!live) return;
        setView(body);
        setLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setError(DASHBOARD_COPY.failed);
        setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [serverHost, pairingToken]);

  const report = React.useCallback((cause: unknown) => {
    const message = cause instanceof AdminRequestError ? cause.message : "";
    setError(message.length > 0 ? message : DASHBOARD_COPY.failed);
  }, []);

  const replace = React.useCallback((setting: ConfigSetting) => {
    setView((current) =>
      current === null
        ? current
        : {
            ...current,
            settings: current.settings.map((entry) =>
              entry.path === setting.path ? setting : entry,
            ),
            overridden: current.settings.filter((entry) =>
              entry.path === setting.path ? setting.isOverridden : entry.isOverridden,
            ).length,
          },
    );
  }, []);

  const save = React.useCallback(
    (path: string, value: unknown) => {
      setError(null);
      void runSave(() =>
        saveConfigValue(serverHost, pairingToken, path, value).then((body) =>
          replace(body.setting),
        ),
      ).catch(report);
    },
    [pairingToken, replace, report, runSave, serverHost],
  );

  const reset = React.useCallback(
    (path: string) => {
      setError(null);
      resetConfigValue(serverHost, pairingToken, path)
        .then((body) => replace(body.setting))
        .catch(report);
    },
    [pairingToken, replace, report, serverHost],
  );

  const reload = React.useCallback(() => {
    setError(null);
    reloadConfig(serverHost, pairingToken).then(setView).catch(report);
  }, [pairingToken, report, serverHost]);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (view?.settings ?? []).filter((setting) => {
      if (bucket !== null && setting.bucket !== bucket) return false;
      if (needle.length === 0) return true;
      return setting.path.toLowerCase().includes(needle);
    });
  }, [bucket, query, view]);

  const groups = React.useMemo(() => {
    const byGroup = new Map<string, ConfigSetting[]>();
    for (const setting of visible) {
      const bag = byGroup.get(setting.group);
      if (bag) bag.push(setting);
      else byGroup.set(setting.group, [setting]);
    }
    return [...byGroup.entries()];
  }, [visible]);

  return (
    <AdminScreen
      title={DASHBOARD_COPY.configTitle}
      blurb={DASHBOARD_COPY.configBlurb}
      isLoading={isLoading}
      error={error}
      trailing={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={DASHBOARD_COPY.reset}
          hitSlop={12}
          onPress={reload}
          className="h-9 w-9 items-center justify-center rounded-full border border-border"
        >
          <AppIcon icon={RefreshIcon} size={15} color={theme.textMuted} />
        </PressableScale>
      }
    >
      <Input
        placeholder={DASHBOARD_COPY.search}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View className="flex-row flex-wrap gap-1.5">
        <BucketChip
          label={`All · ${view?.settings.length ?? 0}`}
          active={bucket === null}
          onPress={() => setBucket(null)}
        />
        {(view?.buckets ?? []).map((entry) => (
          <BucketChip
            key={entry.bucket}
            label={`${entry.label} · ${entry.count}`}
            active={bucket === entry.bucket}
            onPress={() => setBucket(bucket === entry.bucket ? null : entry.bucket)}
          />
        ))}
      </View>

      {bucket !== null ? (
        <Text className="font-ui text-[11px] text-text-muted leading-4">
          {view?.buckets.find((entry) => entry.bucket === bucket)?.blurb}
        </Text>
      ) : null}

      <Text className="font-ui text-xs text-text-muted">
        {DASHBOARD_COPY.overriddenCount(view?.overridden ?? 0)}
      </Text>

      {groups.length === 0 ? (
        <AdminEmpty />
      ) : (
        groups.map(([name, settings], index) => (
          <Animated.View entering={revealAt(index, reduced)} key={name}>
            <CollapsibleSection
              sectionKey={name}
              title={`${name} · ${settings.length}`}
              expanded={openGroup === name}
              onToggle={(key) => setOpenGroup((prev) => (prev === key ? null : key))}
              chevronColor={theme.textMuted}
              className="rounded-card border border-border bg-card p-3"
            >
              <View className="gap-2">
                {settings.map((setting) =>
                  setting.bucket === "editable" ? (
                    <EditableConfigRow
                      key={setting.path}
                      setting={setting}
                      expanded={openPath === setting.path}
                      saveState={saveState}
                      onToggle={() =>
                        setOpenPath((prev) => (prev === setting.path ? null : setting.path))
                      }
                      onSave={(value) => save(setting.path, value)}
                      onReset={() => reset(setting.path)}
                    />
                  ) : (
                    <ReadOnlyConfigRow key={setting.path} setting={setting} />
                  ),
                )}
              </View>
            </CollapsibleSection>
          </Animated.View>
        ))
      )}
    </AdminScreen>
  );
}

function BucketChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={
        active
          ? "rounded-button border border-primary bg-primary px-2.5 py-1 font-ui-medium text-[11px] text-primary-foreground"
          : "rounded-button border border-border px-2.5 py-1 font-ui-medium text-[11px] text-text-muted"
      }
    >
      {label}
    </Text>
  );
}
