import {
  CONFIRM_COPY,
  DASHBOARD_COPY,
  MEDIA_PREVIEW,
  STORAGE_BROWSER,
  UI_MS,
} from "@eidolon/config";
import type { IconSvgElement } from "@hugeicons/react-native";
import * as React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { AdminEmpty } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { AppIcon } from "@/components/common/icon";
import { LoadingState } from "@/components/common/loading-state";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useConfirm } from "@/hooks/use-confirm";
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  File01Icon,
  Folder01Icon,
  GridIcon,
  HardDriveIcon,
  Image01Icon,
  Queue01Icon,
  Search01Icon,
  VolumeHighIcon,
} from "@/lib/icons";
import { select } from "@/services/haptics";
import {
  AdminRequestError,
  type BrowsedFolder,
  type BrowsedObject,
  type BrowseView,
  browseStorage,
  removeStorageObject,
  type StoredMediaKind,
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

function tally(view: BrowseView, shown: number): string {
  const folders = view.folders.length;
  const size = `${megabytes(view.bytes)} MB`;

  if (folders === 0) return `${DASHBOARD_COPY.storageShowing(shown, view.matched)} · ${size}`;
  if (view.matched === 0) return `${DASHBOARD_COPY.storageFolders(folders)} · ${size}`;

  return `${DASHBOARD_COPY.storageFolders(folders)} · ${DASHBOARD_COPY.storageShowing(shown, view.matched)} · ${size}`;
}

function crumbsFor(prefix: string): { name: string; prefix: string }[] {
  const parts = prefix.split("/").filter(Boolean);
  let walked = "";

  return parts.map((part) => {
    walked += `${part}/`;
    return { name: part, prefix: walked };
  });
}

export function StorageBrowser({ serverHost, token, onError }: StorageBrowserProps) {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const confirmation = useConfirm();
  const { height } = useWindowDimensions();

  const [view, setView] = React.useState<BrowseView | null>(null);
  const [objects, setObjects] = React.useState<BrowsedObject[]>([]);
  const [search, setSearch] = React.useState("");
  const [onlyOrphans, setOnlyOrphans] = React.useState(false);
  const [kind, setKind] = React.useState<StoredMediaKind | null>(null);
  const [prefix, setPrefix] = React.useState("");
  const [folderMode, setFolderMode] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [isSearchOpen, setSearchOpen] = React.useState(false);
  const [isBusy, setBusy] = React.useState(false);
  const [hasLoaded, setLoaded] = React.useState(false);

  const report = React.useCallback(
    (cause: unknown) => {
      const message = cause instanceof AdminRequestError ? cause.message : "";
      onError(message.length > 0 ? message : DASHBOARD_COPY.failed);
    },
    [onError],
  );

  const load = React.useCallback(
    (wanted: number) => {
      setBusy(true);
      browseStorage(serverHost, token, {
        search,
        orphans: onlyOrphans,
        kind,
        folderMode,
        prefix,
        offset: wanted * STORAGE_BROWSER.pageSize,
      })
        .then((body) => {
          setView(body);
          setObjects(body.objects);
        })
        .catch(report)
        .finally(() => {
          setBusy(false);
          setLoaded(true);
        });
    },
    [folderMode, kind, onlyOrphans, prefix, report, search, serverHost, token],
  );

  React.useEffect(() => {
    if (search.trim().length === 0) {
      load(page);
      return;
    }

    const timer = setTimeout(() => load(page), UI_MS.searchDebounce);
    return () => clearTimeout(timer);
  }, [load, page, search]);

  const narrow = React.useCallback((change: () => void) => {
    select();
    setPage(0);
    change();
  }, []);

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
            .then(() => load(page))
            .catch(report);
        },
      });
    },
    [confirmation.ask, load, page, report, serverHost, token],
  );

  const crumbs = crumbsFor(view?.prefix ?? prefix);
  const walking = view?.folderMode ?? folderMode;
  const pages = view === null ? 1 : Math.max(1, Math.ceil(view.matched / STORAGE_BROWSER.pageSize));

  return (
    <View className="gap-3">
      <View className="min-h-9 flex-row items-center gap-2">
        {isSearchOpen ? (
          <Animated.View
            className="flex-1"
            entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
          >
            <TextInput
              accessibilityLabel={DASHBOARD_COPY.search}
              value={search}
              onChangeText={(next) => {
                setPage(0);
                setSearch(next);
              }}
              placeholder={DASHBOARD_COPY.search}
              placeholderTextColor={theme.textMuted}
              cursorColor={theme.primary}
              selectionColor={theme.primary}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              className="h-9 rounded-button border border-border bg-input-surface px-4 font-ui text-xs text-text-primary"
              style={{ paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" }}
            />
          </Animated.View>
        ) : (
          <View className="flex-1">
            <Text className="font-ui-bold text-[11px] text-text-muted uppercase tracking-wider">
              {DASHBOARD_COPY.storageBrowse}
            </Text>
            {view ? (
              <Text className="mt-0.5 font-ui text-[10px] text-text-muted" numberOfLines={1}>
                {tally(view, objects.length)}
              </Text>
            ) : null}
          </View>
        )}

        {isBusy && hasLoaded ? <ActivityIndicator size="small" color={theme.primary} /> : null}

        <View
          className="h-8 flex-row overflow-hidden rounded-button border"
          style={{ borderColor: theme.cardBorder, backgroundColor: theme.inputSurface }}
        >
          <ModeChip
            label={DASHBOARD_COPY.storageFlatMode}
            icon={Queue01Icon}
            active={!folderMode}
            onPress={() =>
              narrow(() => {
                setFolderMode(false);
                setPrefix("");
              })
            }
          />
          <ModeChip
            label={DASHBOARD_COPY.storageFolderMode}
            icon={Folder01Icon}
            active={folderMode}
            onPress={() => narrow(() => setFolderMode(true))}
          />
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={DASHBOARD_COPY.search}
          accessibilityState={{ expanded: isSearchOpen }}
          hitSlop={10}
          onPress={() => {
            if (isSearchOpen) setSearch("");
            setSearchOpen(!isSearchOpen);
          }}
          className="h-8 w-8 items-center justify-center rounded-button border"
          style={{
            borderColor: search.length > 0 ? theme.primary : theme.cardBorder,
            backgroundColor: theme.inputSurface,
          }}
        >
          <AppIcon
            icon={isSearchOpen ? Cancel01Icon : Search01Icon}
            size={14}
            color={search.length > 0 ? theme.primary : theme.textMuted}
          />
        </PressableScale>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        <Chip
          label={`${DASHBOARD_COPY.storageAll} ${view?.total ?? 0}`}
          icon={GridIcon}
          active={!onlyOrphans && kind === null}
          colour={theme.primary}
          onPress={() =>
            narrow(() => {
              setOnlyOrphans(false);
              setKind(null);
            })
          }
        />
        <Chip
          label={`${DASHBOARD_COPY.storageImages} ${view?.kinds.image ?? 0}`}
          icon={Image01Icon}
          active={kind === "image"}
          colour={theme.primary}
          onPress={() => narrow(() => setKind(kind === "image" ? null : "image"))}
        />
        <Chip
          label={`${DASHBOARD_COPY.storageAudio} ${view?.kinds.audio ?? 0}`}
          icon={VolumeHighIcon}
          active={kind === "audio"}
          colour={theme.warning}
          onPress={() => narrow(() => setKind(kind === "audio" ? null : "audio"))}
        />
        <Chip
          label={`${DASHBOARD_COPY.storageOther} ${view?.kinds.other ?? 0}`}
          icon={File01Icon}
          active={kind === "other"}
          colour={theme.textMuted}
          onPress={() => narrow(() => setKind(kind === "other" ? null : "other"))}
        />
        <Chip
          label={`${DASHBOARD_COPY.storageOnlyOrphans} ${view?.orphans ?? 0}`}
          icon={AlertCircleIcon}
          active={onlyOrphans}
          colour={theme.danger}
          onPress={() => narrow(() => setOnlyOrphans(!onlyOrphans))}
        />
      </ScrollView>

      {walking ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center", gap: 6 }}
        >
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={view?.bucket ?? DASHBOARD_COPY.storageTitle}
            onPress={() => narrow(() => setPrefix(""))}
            className="flex-row items-center gap-1.5 rounded-button border border-border px-3 py-1.5"
          >
            <AppIcon icon={HardDriveIcon} size={12} color={theme.primary} />
            <Text className="font-ui-medium text-[10px] text-text-primary">
              {view?.bucket ?? ""}
            </Text>
          </PressableScale>

          {crumbs.map((crumb) => (
            <View className="flex-row items-center gap-1" key={crumb.prefix}>
              <AppIcon icon={ArrowRight01Icon} size={11} color={theme.textMuted} />
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={crumb.name}
                onPress={() => narrow(() => setPrefix(crumb.prefix))}
                className="rounded-button border border-border px-3 py-1.5"
              >
                <Text className="font-ui-medium text-[10px] text-text-primary">{crumb.name}</Text>
              </PressableScale>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {(view?.folders ?? []).map((folder, index) => (
        <Animated.View entering={revealAt(index, reduced)} key={folder.prefix}>
          <FolderRow folder={folder} onOpen={() => narrow(() => setPrefix(folder.prefix))} />
        </Animated.View>
      ))}

      {!hasLoaded || (isBusy && objects.length === 0) ? (
        <View
          className="items-center justify-center"
          style={{
            minHeight: Math.max(MEDIA_PREVIEW.loaderBlockPx, height - MEDIA_PREVIEW.loaderChromePx),
          }}
        >
          <LoadingState label={DASHBOARD_COPY.storageScanning} fill={false} />
        </View>
      ) : objects.length === 0 && (view?.folders.length ?? 0) === 0 ? (
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
                  {object.key.slice((view?.prefix ?? "").length) || object.key}
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

      {pages > 1 ? (
        <View className="flex-row items-center justify-between gap-2 pt-1">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={DASHBOARD_COPY.storagePrevious}
            disabled={page === 0 || isBusy}
            onPress={() => {
              select();
              setPage(Math.max(0, page - 1));
            }}
            className="h-8 flex-row items-center gap-1.5 rounded-button border border-border px-3"
            style={{ opacity: page === 0 || isBusy ? 0.4 : 1 }}
          >
            <AppIcon icon={ArrowLeft01Icon} size={13} color={theme.textMuted} />
            <Text className="font-ui-medium text-[10px] text-text-primary">
              {DASHBOARD_COPY.storagePrevious}
            </Text>
          </PressableScale>

          <Text className="font-ui text-[10px] text-text-muted">
            {DASHBOARD_COPY.storagePage(page + 1, pages)}
          </Text>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={DASHBOARD_COPY.storageNext}
            disabled={page + 1 >= pages || isBusy}
            onPress={() => {
              select();
              setPage(Math.min(pages - 1, page + 1));
            }}
            className="h-8 flex-row items-center gap-1.5 rounded-button border border-border px-3"
            style={{ opacity: page + 1 >= pages || isBusy ? 0.4 : 1 }}
          >
            <Text className="font-ui-medium text-[10px] text-text-primary">
              {DASHBOARD_COPY.storageNext}
            </Text>
            <AppIcon icon={ArrowRight01Icon} size={13} color={theme.textMuted} />
          </PressableScale>
        </View>
      ) : null}

      {confirmation.sheet}
    </View>
  );
}

function ModeChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconSvgElement;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useResolvedTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8 }}
      onPress={() => {
        select();
        onPress();
      }}
      className="h-full w-10 items-center justify-center"
      style={{ backgroundColor: active ? theme.primary : "transparent" }}
    >
      <AppIcon icon={icon} size={14} color={active ? theme.primaryForeground : theme.textMuted} />
    </PressableScale>
  );
}

function FolderRow({ folder, onOpen }: { folder: BrowsedFolder; onOpen: () => void }) {
  const theme = useResolvedTheme();

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={folder.name} onPress={onOpen}>
      <GlassSurface
        tint="card"
        className="flex-row items-center gap-3 overflow-hidden rounded-card border border-border px-4 py-3"
      >
        <AppIcon icon={Folder01Icon} size={16} color={theme.primary} />

        <View className="flex-1">
          <Text className="font-ui-medium text-xs text-text-primary" numberOfLines={1}>
            {folder.name}
          </Text>
          <Text className="mt-0.5 font-ui text-[10px] text-text-muted">
            {`${folder.objects} · ${megabytes(folder.bytes)} MB${folder.orphans > 0 ? ` · ${folder.orphans} unreferenced` : ""}`}
          </Text>
        </View>

        <AppIcon icon={ArrowRight01Icon} size={14} color={theme.textMuted} />
      </GlassSurface>
    </PressableScale>
  );
}

function Chip({
  label,
  icon,
  active,
  colour,
  onPress,
}: {
  label: string;
  icon: IconSvgElement;
  active: boolean;
  colour: string;
  onPress: () => void;
}) {
  const theme = useResolvedTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        select();
        onPress();
      }}
    >
      <View
        className="flex-row items-center gap-1.5 rounded-button border px-3 py-1.5"
        style={{
          backgroundColor: active ? colour : theme.inputSurface,
          borderColor: active ? colour : theme.cardBorder,
        }}
      >
        <AppIcon icon={icon} size={11} color={active ? theme.primaryForeground : theme.textMuted} />
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
