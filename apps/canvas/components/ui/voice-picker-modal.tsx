import { CHAT, MIND_COPY, UI_MS, VOICE_COPY } from "@eidolon/config";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as React from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Cancel01Icon, PauseIcon, PlayIcon, Search01Icon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import { useResolvedTheme } from "@/store/theme-store";
import { fetchVoicePreview, fetchVoices, matchesSearch, type Voice } from "@/store/voice-api";

export interface VoicePickerModalProps {
  isOpen: boolean;
  serverHost: string;
  characterId?: string;
  value: string;
  onChange: (voiceId: string) => void;
  onClose: () => void;
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
        className="flex-1 flex-row items-center justify-between rounded-card border bg-input px-3 py-2.5"
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

export function VoicePickerModal({
  isOpen,
  serverHost,
  characterId,
  value,
  onChange,
  onClose,
}: VoicePickerModalProps) {
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
    if (!isOpen) return;
    let cancelled = false;

    void fetchVoices(serverHost).then((catalogue) => {
      if (cancelled) return;
      setVoices(catalogue?.voices ?? []);
      setFailed(catalogue === null);
    });

    return () => {
      cancelled = true;
    };
  }, [serverHost, isOpen]);

  React.useEffect(() => {
    if (!status.playing && previewingId !== null && !loadingId) setPreviewingId(null);
  }, [status.playing, previewingId, loadingId]);

  React.useEffect(() => {
    if (!isOpen && status.playing) player.pause();
  }, [isOpen, status.playing, player]);

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
            onSelect={() => {
              onChange(voice.id);
              onClose();
            }}
            onPreview={() => void preview(voice.id)}
          />
        ))}
      </View>
    );

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
        <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <View className="flex-1">
            <Text className="font-main-bold text-base text-text-primary">{VOICE_COPY.title}</Text>
            <Text className="mt-0.5 font-ui text-[11px] text-text-muted">
              {VOICE_COPY.subtitle}
            </Text>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={MIND_COPY.closeLabel}
            hitSlop={12}
            onPress={onClose}
            className="h-9 w-9 items-center justify-center rounded-full border border-border"
          >
            <AppIcon icon={Cancel01Icon} size={16} color={theme.textMuted} />
          </PressableScale>
        </View>

        <View className="px-4 pt-3">
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
              autoFocus
              className="flex-1 font-ui text-sm text-text-primary"
              style={{ height: CHAT.minTouchTargetPx }}
            />
          </View>
        </View>

        {failed ? (
          <Text className="px-4 py-4 font-ui text-text-muted text-xs">
            {VOICE_COPY.unavailable}
          </Text>
        ) : matched.length === 0 ? (
          <Animated.Text
            entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
            className="px-4 py-4 font-ui text-text-muted text-xs"
          >
            {VOICE_COPY.empty}
          </Animated.Text>
        ) : (
          <ScrollView
            contentContainerStyle={{ gap: 16, padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {section(VOICE_COPY.recommended, recommended)}
            {section(VOICE_COPY.allVoices, rest)}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
