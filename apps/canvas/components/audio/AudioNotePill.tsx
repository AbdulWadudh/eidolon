import { Text } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { useVoiceNotes } from "@/hooks/use-voice-notes";
import { formatVoiceDuration } from "@/lib/format";
import { PlayIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";
import { WaveformBars } from "./WaveformBars";

export interface AudioNotePillProps {
  id: string;
  audioUrl: string | null;
  audioDuration: number | null;
  characterId?: string;
  overlap: number;
}

export function AudioNotePill({
  id,
  audioUrl,
  audioDuration,
  characterId,
  overlap,
}: AudioNotePillProps) {
  const theme = useResolvedTheme(characterId);
  const voice = useVoiceNotes();

  const isActive = voice?.activeId === id;
  const isPlaying = isActive && (voice?.isPlaying ?? false);
  const seconds = isActive && voice?.seconds ? voice.seconds : (audioDuration ?? 0);
  const label = formatVoiceDuration(seconds);
  const disabled = !audioUrl || !voice;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: isActive && voice?.isBuffering, selected: isPlaying }}
      accessibilityLabel={isPlaying ? `Pause voice note ${label}` : `Play voice note ${label}`}
      disabled={disabled}
      hitSlop={10}
      onPress={() => audioUrl && voice?.toggle(id, audioUrl)}
      className="flex-row items-center gap-2 self-start border border-border bg-audio-pill px-3 py-1.5"
      style={{
        marginBottom: -overlap,
        paddingBottom: overlap + 6,
        borderTopLeftRadius: theme.radius,
        borderTopRightRadius: theme.radius,
        borderBottomLeftRadius: theme.radius,
        borderBottomRightRadius: theme.radius,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {isPlaying ? (
        <WaveformBars isPlaying color={theme.primary} />
      ) : (
        <AppIcon icon={PlayIcon} size={13} color={theme.primary} strokeWidth={2.4} />
      )}
      <Text
        className="font-ui-bold text-sm text-text-primary"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
