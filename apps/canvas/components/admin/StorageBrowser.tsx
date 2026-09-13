import { CONFIRM_COPY, DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { Delete02Icon } from "@/lib/icons";
import {
  AdminRequestError,
  type BrowsedObject,
  type BrowseView,
  browseStorage,
  removeStorageObject,
} from "@/store/admin-api";
import { useResolvedTheme } from "@/store/theme-store";

export interface StorageBrowserProps {
  serverHost: string;
  token: string;
  onError: (message: string) => void;
}

function megabytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

export function StorageBrowser({ serverHost, token, onError }: StorageBrowserProps) {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const confirmation = useConfirm();

  const [view, setView] = React.useState<BrowseView | null>(null);
  const [objects, setObjects] = React.useState<BrowsedObject[]>([]);
  const [search, setSearch] = React.useState("");
  const [onlyOrphans, setOnlyOrphans] = React.useState(false);
  const [isBusy, setBusy] = React.useState(false);

  const report = React.useCallback(
    (cause: unknown) => {
      const message = cause instanceof AdminRequestError ? cause.message : "";
      onError(message.length > 0 ? message : DASHBOARD_COPY.failed);
    },
    [onError],
  );

  const load = React.useCallback(
    (offset: number) => {
      setBusy(true);
      browseStorage(serverHost, token, { search, orphans: onlyOrphans, offset })
        .then((body) => {
          setView(body);
          setObjects((current) => (offset === 0 ? body.objects : [...current, ...body.objects]));
        })
        .catch(report)
        .finally(() => setBusy(false));
    },
    [onlyOrphans, report, search, serverHost, token],
  );

  React.useEffect(() => {
    const timer = setTimeout(() => load(0), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const drop = React.useCallback(
    (object: BrowsedObject) => {
      confirmation.ask({
        title: DASHBOARD_COPY.storageDeleteOne,
        body: object.referenced
          ? CONFIRM_COPY.deletePhotoBody
          : DASHBOARD_COPY.storageDeleteOneBody,
        confirmLabel: DASHBOARD_COPY.remove,
        onConfirm: () => {
          removeStorageObject(serverHost, token, object.key)
            .then(() => load(0))
            .catch(report);
        },
      });
    },
    [confirmation.ask, load, report, serverHost, token],
  );

  const more = view !== null && objects.length < view.matched;

  return (
    <View className="gap-2">
      <Text className="font-ui-bold text-[11px] text-text-muted uppercase tracking-wider">
        {DASHBOARD_COPY.storageBrowse}
      </Text>

      <Input
        placeholder={DASHBOARD_COPY.search}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View className="flex-row gap-1.5">
        <Chip
          label={`${DASHBOARD_COPY.storageAll} ${view?.total ?? 0}`}
          active={!onlyOrphans}
          colour={theme.primary}
          onPress={() => setOnlyOrphans(false)}
        />
        <Chip
          label={`${DASHBOARD_COPY.storageOnlyOrphans} ${view?.orphans ?? 0}`}
          active={onlyOrphans}
          colour={theme.danger}
          onPress={() => setOnlyOrphans(true)}
        />
      </View>

      {view ? (
        <Text className="font-ui text-[11px] text-text-muted">
          {`${DASHBOARD_COPY.storageShowing(objects.length, view.matched)} · ${megabytes(view.bytes)} MB`}
        </Text>
      ) : null}

      {objects.length === 0 && !isBusy ? (
        <AdminEmpty label={DASHBOARD_COPY.empty} />
      ) : (
        objects.map((object, index) => (
          <Animated.View entering={revealAt(index, reduced)} key={object.key}>
            <GlassSurface
              tint="card"
              className="gap-2 overflow-hidden rounded-card border border-border px-4 py-2.5"
            >
              <View className="flex-row items-center gap-2">
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: object.referenced ? theme.success : theme.danger }}
                />
                <Text className="flex-1 font-ui text-[11px] text-text-muted" numberOfLines={1}>
                  {object.key}
                </Text>
                <Text className="font-ui-medium text-[10px] text-text-muted">
                  {`${megabytes(object.bytes)} MB`}
                </Text>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={DASHBOARD_COPY.remove}
                  hitSlop={8}
                  onPress={() => drop(object)}
                  className="h-7 w-7 items-center justify-center rounded-button border border-border"
                >
                  <AppIcon icon={Delete02Icon} size={13} color={theme.danger} />
                </PressableScale>
              </View>

              {object.url ? <MediaPreview value={object.url} /> : null}
            </GlassSurface>
          </Animated.View>
        ))
      )}

      {more ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={isBusy}
          onPress={() => load(objects.length)}
        >
          {isBusy ? DASHBOARD_COPY.loading : DASHBOARD_COPY.storageMore}
        </Button>
      ) : null}

      {confirmation.sheet}
    </View>
  );
}

function Chip({
  label,
  active,
  colour,
  onPress,
}: {
  label: string;
  active: boolean;
  colour: string;
  onPress: () => void;
}) {
  const theme = useResolvedTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
    >
      <View
        className="rounded-full border px-2.5 py-1"
        style={{
          backgroundColor: active ? colour : theme.inputSurface,
          borderColor: active ? colour : theme.cardBorder,
        }}
      >
        <Text
          className="font-ui-medium text-[10px]"
          style={{ color: active ? theme.primaryForeground : theme.textMuted }}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
