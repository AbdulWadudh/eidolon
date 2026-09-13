import { CALL_COPY, MEDIA_PREVIEW, VOICE_COPY } from "@eidolon/config";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import * as React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { PauseIcon, PlayIcon } from "@/lib/icons";
import { filenameOf, mediaKindFor } from "@/lib/media-kind";
import { tap } from "@/services/haptics";
import { useResolvedTheme } from "@/store/theme-store";

export interface MediaPreviewProps {
  value: string;
  characterId?: string;
}

export function MediaPreview({ value, characterId }: MediaPreviewProps) {
  const kind = mediaKindFor(value);

  if (kind === "image") return <ImagePreview url={value} characterId={characterId} />;
  if (kind === "audio") return <AudioPreview url={value} characterId={characterId} />;

  return <Text className="font-ui text-[10px] text-text-primary">{value}</Text>;
}

function Caption({ value }: { value: string }) {
  return (
    <Text className="font-ui text-[10px] text-text-muted" numberOfLines={1}>
      {filenameOf(value)}
    </Text>
  );
}

function ImagePreview({ url, characterId }: { url: string; characterId?: string }) {
  const theme = useResolvedTheme(characterId);
  const [failed, setFailed] = React.useState(false);

  if (failed) return <Text className="font-ui text-[10px] text-text-primary">{url}</Text>;

  return (
    <View className="gap-1">
      <View
        className="overflow-hidden rounded-button border border-border"
        style={{ height: MEDIA_PREVIEW.imageHeightPx, backgroundColor: theme.inputSurface }}
      >
        <Image
          source={{ uri: url }}
          contentFit="contain"
          style={{ flex: 1 }}
          onError={() => setFailed(true)}
        />
      </View>
      <Caption value={url} />
    </View>
  );
}

function AudioPreview({ url, characterId }: { url: string; characterId?: string }) {
  const theme = useResolvedTheme(characterId);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [isLoading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const started = React.useRef(false);

  const toggle = React.useCallback(() => {
    if (failed) return;

    if (started.current && status.playing) {
      player.pause();
      return;
    }

    try {
      if (!started.current) {
        setLoading(true);
        player.replace({ uri: url });
        started.current = true;
      }
      tap("light");
      player.play();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [failed, player, status.playing, url]);

  if (failed) return <Text className="font-ui text-[10px] text-text-primary">{url}</Text>;

  return (
    <View className="flex-row items-center gap-2">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={status.playing ? CALL_COPY.mute : VOICE_COPY.preview}
        accessibilityState={{ busy: isLoading }}
        onPress={toggle}
        className="items-center justify-center rounded-full border border-border bg-input"
        style={{ width: MEDIA_PREVIEW.buttonPx, height: MEDIA_PREVIEW.buttonPx }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <AppIcon
            icon={status.playing ? PauseIcon : PlayIcon}
            size={15}
            color={theme.primary}
            strokeWidth={1.8}
          />
        )}
      </PressableScale>

      <View className="flex-1">
        <Caption value={url} />
      </View>
    </View>
  );
}
