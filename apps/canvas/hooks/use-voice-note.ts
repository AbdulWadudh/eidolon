import { CALL_COPY } from "@eidolon/config";
import { requestRecordingPermissionsAsync } from "expo-audio";
import * as React from "react";
import { useServerSpeech } from "@/hooks/use-server-speech";
import { tap } from "@/services/haptics";
import { useChatStore } from "@/store/chat-store";
import { useToastStore } from "@/store/toast-store";

export interface VoiceNote {
  isRecording: boolean;
  toggle: () => void;
}

export function useVoiceNote(characterId: string): VoiceNote {
  const sendVoiceNote = useChatStore((state) => state.sendVoiceNote);

  const speech = useServerSpeech({
    isAvailable: true,
    onUpload: (base64, format) => {
      tap("success");
      sendVoiceNote(characterId, base64, format);
    },
  });

  const isRecording = React.useRef(speech.isListening);
  isRecording.current = speech.isListening;

  React.useEffect(() => {
    if (speech.error) useToastStore.getState().notify(speech.error, "bad");
  }, [speech.error]);

  const toggle = React.useCallback(() => {
    if (isRecording.current) {
      tap("light");
      speech.finish();
      return;
    }

    void requestRecordingPermissionsAsync()
      .then((permission) => {
        if (!permission.granted) {
          useToastStore.getState().notify(CALL_COPY.micDenied, "bad");
          return;
        }

        tap("light");
        speech.begin();
      })
      .catch(() => useToastStore.getState().notify(CALL_COPY.micDenied, "bad"));
  }, [speech]);

  return { isRecording: speech.isListening, toggle };
}
