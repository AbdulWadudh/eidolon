import { CALL_MS, CONNECTION_COPY } from "@eidolon/config";
import { capitalize, isString } from "es-toolkit";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CallControls } from "@/components/call/CallControls";
import { CallStage } from "@/components/call/CallStage";
import { CallSubtitles } from "@/components/call/CallSubtitles";
import { CallTopBar } from "@/components/call/CallTopBar";
import { useCallAudio } from "@/hooks/use-call-audio";
import { useCallSpeech } from "@/hooks/use-call-speech";
import { tap } from "@/services/haptics";
import { onServerMessage, useConductorSocket } from "@/services/websocket";
import { callElapsedSeconds, useCallStore } from "@/store/call-store";
import { useChatStore } from "@/store/chat-store";
import { useConnectionStore } from "@/store/connection";
import { useServerCapability } from "@/store/health-api";
import { useResolvedTheme, useThemeStore } from "@/store/theme-store";

export default function CallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = isString(id) ? id : "default";
  const characterName = capitalize(characterId);

  const theme = useResolvedTheme(characterId);
  const setActiveCharacter = useThemeStore((state) => state.setActiveCharacter);
  const socket = useConductorSocket();
  const serverHost = useConnectionStore((state) => state.serverHost);
  const look = useChatStore((state) => state.characterLook);

  const call = useCallStore();
  const audio = useCallAudio();
  const canTranscribeOnServer = useServerCapability(serverHost, "stt");
  const speech = useCallSpeech(characterId, canTranscribeOnServer);

  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    setActiveCharacter(characterId);
    call.open(characterId);
    return () => {
      setActiveCharacter(null);
    };
  }, [characterId, setActiveCharacter, call.open]);

  React.useEffect(() => onServerMessage(call.handleServerMessage), [call.handleServerMessage]);

  React.useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), CALL_MS.durationTick);
    return () => clearInterval(ticker);
  }, []);

  const isSpeaking = call.phase === "speaking";

  const handleTalkStart = React.useCallback(() => {
    tap("medium");
    if (isSpeaking || call.phase === "thinking") {
      audio.stop();
      call.interrupt();
    }
    call.beginTurn();
    speech.begin();
  }, [isSpeaking, call.phase, call.interrupt, call.beginTurn, audio.stop, speech.begin]);

  const handleTalkEnd = React.useCallback(() => {
    speech.finish();
  }, [speech.finish]);

  const handleEnd = React.useCallback(() => {
    tap("light");
    speech.cancel();
    audio.stop();
    call.close();
    router.back();
  }, [speech.cancel, audio.stop, call.close, router]);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
      className="flex-1 bg-canvas"
    >
      <CallTopBar
        characterId={characterId}
        characterName={characterName}
        elapsedSeconds={callElapsedSeconds(call.startedAt, now)}
        isSpeakerOn={call.isSpeakerOn}
        onBack={() => router.back()}
        onToggleSpeaker={call.toggleSpeaker}
      />

      <View className="flex-1 items-center justify-center gap-8 px-5">
        <CallStage
          characterId={characterId}
          characterName={characterName}
          avatarUrl={look.avatarUrl}
          avatarCrop={look.avatarCrop}
          phase={call.phase}
          isMuted={call.isMuted}
          isListening={speech.isListening}
          amplitude={audio.amplitude}
        />

        <CallSubtitles
          characterId={characterId}
          characterName={characterName}
          subtitle={call.subtitle}
          heard={call.heard}
          isListening={speech.isListening}
          error={speech.error}
        />

        {socket.isConnected ? null : (
          <View className="w-full rounded-card border border-border bg-card px-4 py-3">
            <Text className="font-ui-medium text-center text-sm" style={{ color: theme.danger }}>
              {CONNECTION_COPY[socket.status]}
            </Text>
          </View>
        )}
      </View>

      <View className="px-5 pb-4 pt-2">
        <CallControls
          characterId={characterId}
          isMuted={call.isMuted}
          isListening={speech.isListening}
          canTalk={!call.isMuted && speech.mode !== "unavailable" && socket.isConnected}
          onToggleMute={() => {
            tap("light");
            if (speech.isListening) speech.cancel();
            call.toggleMute();
          }}
          onTalkStart={handleTalkStart}
          onTalkEnd={handleTalkEnd}
          onEnd={handleEnd}
        />
      </View>
    </SafeAreaView>
  );
}
