import { CHAT, UI_MS, VOICE_COPY } from "@eidolon/config";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as React from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { PauseIcon, PlayIcon, Search01Icon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import { useResolvedTheme } from "@/store/theme-store";
import { fetchVoicePreview, fetchVoices, matchesSearch, type Voice } from "@/store/voice-api";

export interface VoicePickerProps {
  serverHost: string;
  characterId?: string;
  value: string;
  onChange: (voiceId: string) => void;
}

interface RowProps {
  voice: Voice;
  selected: boolean;
  playing: boolean;
  loading: boolean;
  tint: string;
  border: string;
  onSelect: () => void;
  onPreview: () => void;
}

function VoiceRow({
  voice,
  selected,
  playing,
  loading,
  tint,
  border,
  onSelect,
  onPreview,
}: RowProps) {
  return (
    <View className="flex-row items-center gap-2">
      <PressableScale
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${voice.name}, ${voice.gender}, ${voice.language}`}
        accessibilityHint={voice.grade ? `${VOICE_COPY.gradeLabel} ${voice.grade}` : undefined}
        onPress={onSelect}
        className="flex-1 flex-row items-center justify-between rounded-card border bg-input px-3 py-3"
        style={{ minHeight: CHAT.minTouchTargetPx, borderColor: selected ? tint : border }}
      >
        <View className="flex-1 pr-2">
          <Text
            className="font-ui-medium text-sm"
            style={{ color: selected ? tint : undefined }}
            numberOfLines={1}
          >
            {voice.name}
          </Text>
          <Text className="mt-0.5 font-ui text-[11px] text-text-muted" numberOfLines={1}>
            {`${voice.gender} · ${voice.language}`}
          </Text>
        </View>

        {voice.grade ? (
          <Text className="font-ui-bold text-[10px] text-text-muted">{voice.grade}</Text>
        ) : null}
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${VOICE_COPY.preview}: ${voice.name}`}
        accessibilityState={{ busy: loading }}
        onPress={onPreview}
        className="items-center justify-center rounded-button border border-border bg-input"
        style={{ width: CHAT.minTouchTargetPx, height: CHAT.minTouchTargetPx }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tint} />
        ) : (
          <AppIcon icon={playing ? PauseIcon : PlayIcon} size={16} color={tint} strokeWidth={1.8} />
        )}
      </PressableScale>
    </View>
  );
}

export function VoicePicker({ serverHost, characterId, value, onChange }: VoicePickerProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  const [voices, setVoices] = React.useState<Voice[]>([]);
  const [failed, setFailed] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  React.useEffect(() => {
    let cancelled = false;

    void fetchVoices(serverHost).then((catalogue) => {
      if (cancelled) return;
      setVoices(catalogue?.voices ?? []);
      setFailed(catalogue === null);
    });

    return () => {
      cancelled = true;
    };
  }, [serverHost]);

  // The sample is generated on demand, so the button stays busy until audio
  // actually arrives rather than pretending it played instantly.
  React.useEffect(() => {
    if (!status.playing && previewingId !== null && !loadingId) setPreviewingId(null);
  }, [status.playing, previewingId, loadingId]);

  const preview = React.useCallback(
    async (voiceId: string) => {
      if (previewingId === voiceId && status.playing) {
        player.pause();
        setPreviewingId(null);
        return;
      }

      setLoadingId(voiceId);
      const uri = await fetchVoicePreview(serverHost, voiceId);
      setLoadingId(null);
      if (!uri) return;

      tap("light");
      player.replace({ uri });
      player.play();
      setPreviewingId(voiceId);
    },
    [serverHost, player, previewingId, status.playing],
  );

  const matched = voices.filter((voice) => matchesSearch(voice, query));
  const recommended = matched.filter((voice) => voice.recommended);
  const rest = matched.filter((voice) => !voice.recommended);

  const section = (title: string, list: Voice[]) =>
    list.length === 0 ? null : (
      <View className="gap-2" key={title}>
        <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
          {title}
        </Text>
        {list.map((voice) => (
          <VoiceRow
            key={voice.id}
            voice={voice}
            selected={voice.id === value}
            playing={previewingId === voice.id && status.playing}
            loading={loadingId === voice.id}
            tint={theme.primary}
            border={theme.cardBorder}
            onSelect={() => onChange(voice.id)}
            onPreview={() => void preview(voice.id)}
          />
        ))}
      </View>
    );

  return (
    <View className="gap-3">
      <View>
        <Text className="font-main-bold text-base text-text-primary">{VOICE_COPY.title}</Text>
        <Text className="mt-0.5 font-ui text-[11px] text-text-muted">{VOICE_COPY.subtitle}</Text>
      </View>

      <View className="flex-row items-center gap-2 rounded-button border border-border bg-input px-3">
        <AppIcon icon={Search01Icon} size={16} color={theme.textMuted} strokeWidth={1.8} />
        <TextInput
          accessibilityLabel={VOICE_COPY.search}
          value={query}
          onChangeText={setQuery}
          placeholder={VOICE_COPY.search}
          placeholderTextColor={theme.textMuted}
          cursorColor={theme.primary}
          selectionColor={theme.primary}
          className="flex-1 font-ui text-sm text-text-primary"
          style={{ height: CHAT.minTouchTargetPx }}
        />
      </View>

      {failed ? (
        <Text className="font-ui text-text-muted text-xs">{VOICE_COPY.unavailable}</Text>
      ) : matched.length === 0 ? (
        <Animated.Text
          entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
          className="font-ui text-text-muted text-xs"
        >
          {VOICE_COPY.empty}
        </Animated.Text>
      ) : (
        <ScrollView
          className="max-h-96"
          contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {section(VOICE_COPY.recommended, recommended)}
          {section(VOICE_COPY.allVoices, rest)}
        </ScrollView>
      )}
    </View>
  );
}
