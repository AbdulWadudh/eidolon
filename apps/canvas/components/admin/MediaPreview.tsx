import { CALL_COPY, DASHBOARD_COPY, MEDIA_PREVIEW, UI_MS, VOICE_COPY } from "@eidolon/config";
import { Image } from "expo-image";
import * as React from "react";
import { ActivityIndicator, Clipboard, Text, View } from "react-native";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { ClipboardIcon, Download01Icon, PauseIcon, PlayIcon, SentIcon } from "@/lib/icons";
import { filenameOf, isUrlLike, mediaKindFor } from "@/lib/media-kind";
import { saveMediaToDevice, shareMedia } from "@/lib/save-media";
import { tap } from "@/services/haptics";
import { usePreviewAudio } from "@/store/preview-audio";
import { useResolvedTheme } from "@/store/theme-store";
import { notify } from "@/store/toast-store";

export interface MediaPreviewProps {
  value: string;
  characterId?: string;
  compact?: boolean;
}

export function MediaPreview({ value, characterId, compact = false }: MediaPreviewProps) {
  const kind = mediaKindFor(value);

  if (kind === "image")
    return <ImagePreview url={value} characterId={characterId} compact={compact} />;
  if (kind === "audio") return <AudioPreview url={value} characterId={characterId} />;

  return (
    <View className="flex-row items-start gap-2">
      <Text className="flex-1 font-ui text-[10px] text-text-primary">{value}</Text>
      <CopyButton value={value} characterId={characterId} />
      {isUrlLike(value) ? (
        <>
          <ShareButton url={value} characterId={characterId} />
          <DownloadButton url={value} characterId={characterId} />
        </>
      ) : null}
    </View>
  );
}

function Caption({ value }: { value: string }) {
  return (
    <Text className="flex-1 font-ui text-[10px] text-text-muted" numberOfLines={1}>
      {filenameOf(value)}
    </Text>
  );
}

export function CopyButton({ value, characterId }: { value: string; characterId?: string }) {
  const theme = useResolvedTheme(characterId);
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = React.useCallback(() => {
    Clipboard.setString(value);
    tap("light");
    notify(DASHBOARD_COPY.copied, "good");
    setCopied(true);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), UI_MS.copyFeedback);
  }, [value]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={copied ? DASHBOARD_COPY.copied : DASHBOARD_COPY.copy}
      hitSlop={8}
      onPress={copy}
      className="h-7 w-7 items-center justify-center rounded-button border border-border"
    >
      <AppIcon icon={ClipboardIcon} size={13} color={copied ? theme.success : theme.textMuted} />
    </PressableScale>
  );
}

export function ShareButton({ url, characterId }: { url: string; characterId?: string }) {
  const theme = useResolvedTheme(characterId);
  const [isBusy, setBusy] = React.useState(false);

  const send = React.useCallback(() => {
    if (isBusy) return;
    setBusy(true);

    void shareMedia(url)
      .then((result) => {
        if (result === "shared") {
          tap("success");
          return;
        }
        tap("light");
        notify(
          result === "unavailable" ? DASHBOARD_COPY.shareUnavailable : DASHBOARD_COPY.shareFailed,
          "bad",
        );
      })
      .finally(() => setBusy(false));
  }, [isBusy, url]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={DASHBOARD_COPY.share}
      accessibilityState={{ busy: isBusy }}
      hitSlop={8}
      onPress={send}
      className="h-7 w-7 items-center justify-center rounded-button border border-border"
    >
      {isBusy ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <AppIcon icon={SentIcon} size={13} color={theme.textMuted} />
      )}
    </PressableScale>
  );
}

export function DownloadButton({ url, characterId }: { url: string; characterId?: string }) {
  const theme = useResolvedTheme(characterId);
  const [isSaving, setSaving] = React.useState(false);

  const save = React.useCallback(() => {
    if (isSaving) return;
    setSaving(true);

    void saveMediaToDevice(url)
      .then((outcome) => {
        if (outcome.result === "saved") {
          tap("success");
          notify(
            outcome.target === "gallery"
              ? DASHBOARD_COPY.downloadedGallery
              : DASHBOARD_COPY.downloadedFile(outcome.name),
            "good",
          );
          return;
        }

        tap("light");
        notify(
          outcome.result === "denied"
            ? DASHBOARD_COPY.downloadDenied
            : DASHBOARD_COPY.downloadFailed,
          "bad",
        );
      })
      .finally(() => setSaving(false));
  }, [isSaving, url]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={DASHBOARD_COPY.download}
      accessibilityState={{ busy: isSaving }}
      hitSlop={8}
      onPress={save}
      className="h-7 w-7 items-center justify-center rounded-button border border-border"
    >
      {isSaving ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <AppIcon icon={Download01Icon} size={13} color={theme.textMuted} />
      )}
    </PressableScale>
  );
}

function ImagePreview({
  url,
  characterId,
  compact = false,
}: {
  url: string;
  characterId?: string;
  compact?: boolean;
}) {
  const theme = useResolvedTheme(characterId);
  const [failed, setFailed] = React.useState(false);
  const [isOpen, setOpen] = React.useState(false);

  if (failed) {
    return (
      <View className="flex-row items-start gap-2">
        <Text className="flex-1 font-ui text-[10px] text-text-primary">{url}</Text>
        <CopyButton value={url} characterId={characterId} />
      </View>
    );
  }

  if (compact) {
    return (
      <View className="flex-row items-center gap-2">
        <PressableScale
          accessibilityRole="imagebutton"
          accessibilityLabel={filenameOf(url)}
          onPress={() => setOpen(true)}
          className="overflow-hidden rounded-button border border-border"
          style={{
            width: MEDIA_PREVIEW.thumbPx,
            height: MEDIA_PREVIEW.thumbPx,
            backgroundColor: theme.inputSurface,
          }}
        >
          <Image
            source={{ uri: url }}
            contentFit="cover"
            recyclingKey={url}
            style={{ flex: 1 }}
            onError={() => setFailed(true)}
          />
        </PressableScale>

        <Caption value={url} />
        <CopyButton value={url} characterId={characterId} />
        <ShareButton url={url} characterId={characterId} />
        <DownloadButton url={url} characterId={characterId} />

        <ImageLightbox url={isOpen ? url : null} onClose={() => setOpen(false)} />
      </View>
    );
  }

  return (
    <View className="gap-1">
      <PressableScale
        accessibilityRole="imagebutton"
        accessibilityLabel={filenameOf(url)}
        onPress={() => setOpen(true)}
        className="overflow-hidden rounded-button border border-border"
        style={{ height: MEDIA_PREVIEW.imageHeightPx, backgroundColor: theme.inputSurface }}
      >
        <Image
          source={{ uri: url }}
          contentFit="contain"
          recyclingKey={url}
          style={{ flex: 1 }}
          onError={() => setFailed(true)}
        />
      </PressableScale>

      <View className="flex-row items-center gap-2">
        <Caption value={url} />
        <CopyButton value={url} characterId={characterId} />
        <ShareButton url={url} characterId={characterId} />
        <DownloadButton url={url} characterId={characterId} />
      </View>

      <ImageLightbox url={isOpen ? url : null} onClose={() => setOpen(false)} />
    </View>
  );
}

function AudioPreview({ url, characterId }: { url: string; characterId?: string }) {
  const theme = useResolvedTheme(characterId);
  const isPlaying = usePreviewAudio((state) => state.playingUrl === url);
  const isLoading = usePreviewAudio((state) => state.loadingUrl === url);
  const toggle = usePreviewAudio((state) => state.toggle);

  return (
    <View className="flex-row items-center gap-2">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? CALL_COPY.mute : VOICE_COPY.preview}
        accessibilityState={{ busy: isLoading }}
        onPress={() => toggle(url)}
        className="items-center justify-center rounded-full border border-border bg-input"
        style={{ width: MEDIA_PREVIEW.buttonPx, height: MEDIA_PREVIEW.buttonPx }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <AppIcon
            icon={isPlaying ? PauseIcon : PlayIcon}
            size={15}
            color={theme.primary}
            strokeWidth={1.8}
          />
        )}
      </PressableScale>

      <Caption value={url} />
      <CopyButton value={url} characterId={characterId} />
      <ShareButton url={url} characterId={characterId} />
      <DownloadButton url={url} characterId={characterId} />
    </View>
  );
}
