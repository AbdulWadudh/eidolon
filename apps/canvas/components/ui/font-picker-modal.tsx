import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { Cancel01Icon, CheckmarkCircle01Icon } from "@/lib/icons";
import { FONT_FAMILY_PRESETS } from "@/lib/theme-presets";
import {
  isHeavyFamily,
  loadFontPreview,
  type PreviewState,
  previewFontName,
} from "@/services/font-previews";
import { getInstalledFontFamilies, installGoogleFont } from "@/services/font-registry";
import {
  fetchFontCatalogue,
  type GoogleFontFamily,
  GoogleFontsError,
  searchFontCatalogue,
} from "@/services/google-fonts";
import { useResolvedTheme } from "@/store/theme-store";

export const FONT_PREVIEW_SAMPLE = "Aa Bb Cc — 0123";

/** Already registered, so it can be rendered in its own face. */
interface LocalRow {
  kind: "local";
  key: string;
  name: string;
  value: string;
}

/** Not downloaded yet, so only its metadata can be shown. */
interface RemoteRow {
  kind: "remote";
  key: string;
  entry: GoogleFontFamily;
}

type Row = LocalRow | RemoteRow;

export interface FontPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotLabel: string;
  currentValue: string;
  onApply: (fontName: string) => void;
  accentColor: string;
  mutedColor: string;
}

export function FontPickerModal({
  isOpen,
  onClose,
  slotLabel,
  currentValue,
  onApply,
  accentColor,
  mutedColor,
}: FontPickerModalProps) {
  const [catalogue, setCatalogue] = React.useState<GoogleFontFamily[] | null>(null);
  const [catalogueError, setCatalogueError] = React.useState<string | null>(null);
  const [installError, setInstallError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [installing, setInstalling] = React.useState<string | null>(null);
  const [installedVersion, setInstalledVersion] = React.useState(0);

  // A non-transparent RN Modal falls back to the system window background, which
  // is white on a light-themed device. Every other modal here paints the canvas
  // inline rather than relying on the class resolving inside the modal root.
  const theme = useResolvedTheme();
  const [previews, setPreviews] = React.useState<Record<string, PreviewState>>({});

  // One request for ~1800 families, so typing filters in memory and never
  // touches the network.
  React.useEffect(() => {
    if (!isOpen || catalogue) return;
    let cancelled = false;
    setCatalogueError(null);
    fetchFontCatalogue()
      .then((items) => {
        if (!cancelled) setCatalogue(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCatalogueError(
          err instanceof GoogleFontsError
            ? err.message
            : "Could not load the font catalogue. Check your connection and try again.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, catalogue]);

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  const localRows = React.useMemo<LocalRow[]>(() => {
    // installedVersion is the dependency: a fresh install changes the list.
    void installedVersion;
    const bundled = FONT_FAMILY_PRESETS.map((preset) => ({
      kind: "local" as const,
      key: `preset:${preset.family}`,
      name: preset.name,
      value: preset.family,
    }));
    const installed = getInstalledFontFamilies().map((font) => ({
      kind: "local" as const,
      key: `installed:${font.value}`,
      name: font.family,
      value: font.value,
    }));
    return [...bundled, ...installed];
  }, [installedVersion]);

  const rows = React.useMemo<Row[]>(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    const locals = needle
      ? localRows.filter(
          (row) =>
            row.name.toLowerCase().includes(needle) || row.value.toLowerCase().includes(needle),
        )
      : localRows;

    const localValues = new Set(locals.map((row) => row.value.toLowerCase()));
    const remote = catalogue
      ? searchFontCatalogue(catalogue, debouncedQuery)
          .filter(
            (entry) => !localValues.has(`${entry.family.replace(/[^a-zA-Z0-9]/g, "")}-regular`),
          )
          .map<RemoteRow>((entry) => ({ kind: "remote", key: `google:${entry.family}`, entry }))
      : [];

    return [...locals, ...remote];
  }, [localRows, catalogue, debouncedQuery]);

  // Only the rows on screen are fetched, so scrolling fills previews in as you
  // go rather than downloading the whole catalogue up front.
  const requestPreviews = React.useCallback((items: ViewToken[]) => {
    for (const token of items) {
      const row = token.item as Row | undefined;
      if (row?.kind !== "remote") continue;
      const { entry } = row;
      loadFontPreview(entry).then((state) => {
        setPreviews((prev) =>
          prev[entry.family] === state ? prev : { ...prev, [entry.family]: state },
        );
      });
    }
  }, []);

  // FlatList requires these to keep a stable identity for its lifetime.
  const requestPreviewsRef = React.useRef(requestPreviews);
  requestPreviewsRef.current = requestPreviews;
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 40 }).current;
  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      requestPreviewsRef.current(viewableItems);
    },
  ).current;

  const applyLocal = React.useCallback(
    (value: string) => {
      onApply(value);
      onClose();
    },
    [onApply, onClose],
  );

  const installRemote = React.useCallback(
    async (entry: GoogleFontFamily) => {
      setInstalling(entry.family);
      setInstallError(null);
      try {
        const fontName = await installGoogleFont(entry);
        if (fontName) {
          setInstalledVersion((v) => v + 1);
          onApply(fontName);
          onClose();
        } else {
          setInstallError(`${entry.family} does not publish a usable font file.`);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        setInstallError(`Could not install ${entry.family}. ${reason}`);
      } finally {
        setInstalling(null);
      }
    },
    [onApply, onClose],
  );

  const renderItem = React.useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === "local") {
        const isSelected = currentValue === item.value;
        return (
          <Pressable
            className={`mb-2 flex-row items-center justify-between rounded-button border px-3 py-2.5 ${
              isSelected ? "border-primary bg-input" : "border-border bg-input"
            }`}
            onPress={() => applyLocal(item.value)}
            disabled={installing !== null}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <View className="flex-1">
              {/* Registered already, so the sample renders in the real face. */}
              <Text
                className="text-base text-text-primary"
                style={{ fontFamily: item.value }}
                numberOfLines={1}
              >
                {FONT_PREVIEW_SAMPLE}
              </Text>
              <Text className="font-ui text-[10px] text-text-muted">{item.name}</Text>
            </View>
            {isSelected ? (
              <AppIcon icon={CheckmarkCircle01Icon} size={16} color={accentColor} />
            ) : null}
          </Pressable>
        );
      }

      const { entry } = item;
      const isBusy = installing === entry.family;
      const previewState = previews[entry.family];
      const canPreview = previewState === "ready";
      const heavy = isHeavyFamily(entry);
      return (
        <Pressable
          className="mb-2 flex-row items-center justify-between rounded-button border border-border bg-card px-3 py-2.5"
          onPress={() => installRemote(entry)}
          disabled={installing !== null}
          accessibilityRole="button"
          accessibilityState={{ busy: isBusy }}
        >
          <View className="flex-1">
            {canPreview ? (
              <Text
                className="text-base text-text-primary"
                style={{ fontFamily: previewFontName(entry.family) }}
                numberOfLines={1}
              >
                {FONT_PREVIEW_SAMPLE}
              </Text>
            ) : (
              <Text className="font-ui text-sm text-text-primary">{entry.family}</Text>
            )}
            <Text className="font-ui text-[10px] text-text-muted">
              {canPreview ? `${entry.family} · ` : ""}
              {entry.category} · {entry.variants.length} styles
              {heavy ? " · large file" : ""}
            </Text>
          </View>
          {isBusy ? <ActivityIndicator size="small" color={accentColor} /> : null}
        </Pressable>
      );
    },
    [currentValue, applyLocal, installRemote, installing, accentColor, previews],
  );

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1" style={{ flex: 1, backgroundColor: theme.canvas }}>
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <View className="flex-1">
            <Text className="font-main-bold text-base text-text-primary">Choose a font</Text>
            <Text className="font-ui text-[11px] text-text-muted">Applies to {slotLabel}</Text>
          </View>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-button border border-border bg-card active:bg-border"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close font picker"
          >
            <AppIcon icon={Cancel01Icon} size={18} color={mutedColor} />
          </Pressable>
        </View>

        <View className="px-4 py-3">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search installed and Google Fonts"
            placeholderTextColor={mutedColor}
            className="h-11 rounded-input border border-border bg-input px-3 font-ui text-sm text-text-primary"
            style={{ paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" }}
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>

        {installError || catalogueError ? (
          <View className="mx-4 mb-2 rounded-card border border-danger/40 bg-input p-3">
            <Text className="font-ui text-xs text-danger">{installError ?? catalogueError}</Text>
          </View>
        ) : null}

        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          ListFooterComponent={
            !catalogue && !catalogueError ? (
              <View className="items-center gap-2 py-4">
                <ActivityIndicator size="small" color={accentColor} />
                <Text className="font-ui text-[11px] text-text-muted">
                  Loading Google Fonts catalogue…
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            catalogue ? (
              <Text className="mt-6 text-center font-ui text-xs text-text-muted">
                No fonts match “{debouncedQuery}”.
              </Text>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
