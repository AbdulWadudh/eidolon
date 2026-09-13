import { VOICE_COPY, voiceLabel } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { VoicePickerModal } from "@/components/ui/voice-picker-modal";
import { ArrowDown01Icon, VolumeHighIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface VoicePickerProps {
  serverHost: string;
  characterId?: string;
  value: string;
  onChange: (voiceId: string) => void;
}

export function VoicePicker({ serverHost, characterId, value, onChange }: VoicePickerProps) {
  const theme = useResolvedTheme(characterId);
  const [isPicking, setIsPicking] = React.useState(false);

  return (
    <View>
      <Text className="mb-1.5 font-ui-bold text-[11px] text-text-muted uppercase tracking-wider">
        {VOICE_COPY.title}
      </Text>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${VOICE_COPY.title}: ${voiceLabel(value)}`}
        onPress={() => setIsPicking(true)}
        className="flex-row items-center gap-2 rounded-button border border-border bg-input px-3 py-2.5"
      >
        <AppIcon icon={VolumeHighIcon} size={15} color={theme.primary} strokeWidth={1.8} />
        <Text className="flex-1 font-ui-medium text-sm text-text-primary" numberOfLines={1}>
          {voiceLabel(value)}
        </Text>
        <AppIcon icon={ArrowDown01Icon} size={16} color={theme.textMuted} />
      </PressableScale>

      <VoicePickerModal
        isOpen={isPicking}
        serverHost={serverHost}
        characterId={characterId}
        value={value}
        onChange={onChange}
        onClose={() => setIsPicking(false)}
      />
    </View>
  );
}
