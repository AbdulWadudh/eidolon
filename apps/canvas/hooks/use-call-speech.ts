import { CALL_COPY, SPEECH, type SpeechMode } from "@eidolon/config";
import * as React from "react";
import { useAutoListen } from "@/hooks/use-auto-listen";
import { type SpeechCapture, useDeviceSpeech } from "@/hooks/use-device-speech";
import { useServerSpeech } from "@/hooks/use-server-speech";
import { sendMessage } from "@/services/websocket";
import { useCallStore } from "@/store/call-store";
import { useChatStore } from "@/store/chat-store";

export interface CallSpeech extends SpeechCapture {
  mode: SpeechMode;
  isAuto: boolean;
}

export interface CallSpeechOptions {
  characterId: string;
  canTranscribeOnServer: boolean;
  shouldOpen: boolean;
}

export function useCallSpeech({
  characterId,
  canTranscribeOnServer,
  shouldOpen,
}: CallSpeechOptions): CallSpeech {
  const commitTyped = useChatStore((state) => state.sendUserMessage);
  const setHeard = useCallStore((state) => state.setHeard);
  const beginTurn = useCallStore((state) => state.beginTurn);

  const boundary = React.useRef<{ start: () => void; end: () => void }>({
    start: () => {},
    end: () => {},
  });

  const onCommit = React.useCallback(
    (text: string) => {
      setHeard(text);
      commitTyped(text, characterId);
    },
    [commitTyped, characterId, setHeard],
  );

  const onSpeechStart = React.useCallback(() => {
    beginTurn();
    boundary.current.start();
  }, [beginTurn]);

  const onSpeechEnd = React.useCallback(() => {
    boundary.current.end();
  }, []);

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

  const device = useDeviceSpeech({ onCommit, onSpeechStart, onSpeechEnd });
  const server = useServerSpeech({
    isAvailable: !device.isAvailable && canTranscribeOnServer,
    onUpload,
  });

  const mode: SpeechMode = device.isAvailable
    ? "device"
    : canTranscribeOnServer
      ? "server"
      : "unavailable";

  const isAuto = mode === "device" && SPEECH.autoListen;

  const auto = useAutoListen({
    enabled: isAuto,
    shouldOpen,
    isListening: device.isListening,
    begin: device.begin,
    finish: device.finish,
    cancel: device.cancel,
  });

  boundary.current = { start: auto.noteSpeechStart, end: auto.noteSpeechEnd };

  const active = mode === "device" ? device : server;

  React.useEffect(() => {
    setHeard(active.heard);
  }, [active.heard, setHeard]);

  const noop = React.useCallback(() => undefined, []);

  if (mode === "unavailable") {
    return {
      mode,
      isAuto: false,
      isAvailable: false,
      isListening: false,
      heard: "",
      error: CALL_COPY.noRecogniser,
      begin: noop,
      finish: noop,
      cancel: noop,
    };
  }

  return { mode, isAuto, ...active };
}
