import { CALL, CALL_COPY, callSpeakingLine } from "@eidolon/config";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { AqueousPool } from "@/components/audio/AqueousPool";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { croppedStyle } from "@/lib/avatar-crop";
import type { CallPhase } from "@/store/call-store";
import type { AvatarCropRect } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

const PHASE_LINE: Record<CallPhase, string> = {
  connecting: CALL_COPY.connecting,
  listening: CALL_COPY.listening,
  thinking: CALL_COPY.thinking,
  speaking: "",
  ended: CALL_COPY.offline,
};

export interface CallStageProps {
  characterId: string;
  characterName: string;
  avatarUrl: string | null;
  avatarCrop: AvatarCropRect | null;
  phase: CallPhase;
  isMuted: boolean;
  isListening: boolean;
  amplitude: SharedValue<number>;
}

export function CallStage({
  characterId,
  characterName,
  avatarUrl,
  avatarCrop,
  phase,
  isMuted,
  isListening,
  amplitude,
}: CallStageProps) {
  const theme = useResolvedTheme(characterId);
  const initials = characterName.slice(0, 2).toUpperCase();
  const line = isListening
    ? CALL_COPY.hearing
    : phase === "speaking"
      ? callSpeakingLine(characterName)
      : PHASE_LINE[phase];
  const status = isMuted && !isListening && phase === "listening" ? CALL_COPY.muted : line;

  return (
    <View className="items-center">
      <AqueousPool amplitude={amplitude} isActive={phase === "speaking"} color={theme.primary}>
        <Avatar
          size={CALL.avatarPx}
          className="overflow-hidden"
          style={{ borderWidth: CALL.avatarBorderPx, borderColor: theme.primary }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              contentFit={avatarCrop ? "fill" : "cover"}
              cachePolicy="disk"
              accessibilityLabel={`${characterName}'s picture`}
              style={
                avatarCrop
                  ? croppedStyle(avatarCrop, CALL.avatarPx)
                  : { width: "100%", height: "100%" }
              }
            />
          ) : (
            <AvatarFallback textClassName="font-main-bold text-2xl text-primary">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
      </AqueousPool>

      <View className="mt-4 rounded-full border border-border bg-audio-pill px-4 py-2">
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          className="font-main-italic text-text-primary"
          style={{ fontSize: 14 }}
          numberOfLines={1}
        >
          {status}
        </Text>
      </View>
    </View>
  );
}
