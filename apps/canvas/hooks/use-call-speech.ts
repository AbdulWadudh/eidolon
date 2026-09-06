import { CALL_COPY, type SpeechMode } from "@eidolon/config";
import * as React from "react";
import { type SpeechCapture, useDeviceSpeech } from "@/hooks/use-device-speech";
import { useServerSpeech } from "@/hooks/use-server-speech";
import { sendMessage } from "@/services/websocket";
import { useCallStore } from "@/store/call-store";
import { useChatStore } from "@/store/chat-store";

export interface CallSpeech extends SpeechCapture {
  mode: SpeechMode;
}

export function useCallSpeech(characterId: string, canTranscribeOnServer: boolean): CallSpeech {
  const commitTyped = useChatStore((state) => state.sendUserMessage);
  const setHeard = useCallStore((state) => state.setHeard);

  const onCommit = React.useCallback(
    (text: string) => {
      setHeard(text);
      commitTyped(text, characterId);
    },
    [commitTyped, characterId, setHeard],
  );

  const onUpload = React.useCallback(
    (base64: string, format: string) => {
      sendMessage({
        type: "voice_input",
        character_id: characterId,
        format,
        data: base64,
        allow_search: true,
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        live_voice: true,
      });
    },
    [characterId],
  );

  const device = useDeviceSpeech(onCommit);
  const server = useServerSpeech({
    isAvailable: !device.isAvailable && canTranscribeOnServer,
    onUpload,
  });

  const mode: SpeechMode = device.isAvailable
    ? "device"
    : canTranscribeOnServer
      ? "server"
      : "unavailable";

  const active = mode === "device" ? device : server;

  React.useEffect(() => {
    setHeard(active.heard);
  }, [active.heard, setHeard]);

  const noop = React.useCallback(() => undefined, []);

  if (mode === "unavailable") {
    return {
      mode,
      isAvailable: false,
      isListening: false,
      heard: "",
      error: CALL_COPY.noRecogniser,
      begin: noop,
      finish: noop,
      cancel: noop,
    };
  }

  return { mode, ...active };
}
