import { CALL_COPY, SPEECH } from "@eidolon/config";
import { RecordingPresets, useAudioRecorder } from "expo-audio";
import * as React from "react";
import type { SpeechCapture } from "@/hooks/use-device-speech";
import { readAudioAsBase64 } from "@/lib/audio-cache";

export interface ServerSpeechOptions {
  isAvailable: boolean;
  onUpload: (base64: string, format: string) => void;
}

export function useServerSpeech({ isAvailable, onUpload }: ServerSpeechOptions): SpeechCapture {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isListening, setListening] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const wants = React.useRef(false);

  const begin = React.useCallback(() => {
    if (!isAvailable) return;

    setError(null);
    wants.current = true;
    setListening(true);

    void recorder
      .prepareToRecordAsync()
      .then(() => {
        if (!wants.current) return;
        recorder.record();
      })
      .catch(() => {
        wants.current = false;
        setListening(false);
        setError(CALL_COPY.micDenied);
      });
  }, [isAvailable, recorder]);

  const finish = React.useCallback(() => {
    if (!wants.current) return;
    wants.current = false;
    setListening(false);

    void recorder
      .stop()
      .then(async () => {
        const uri = recorder.uri;
        if (!uri) {
          setError(CALL_COPY.heardNothing);
          return;
        }

        const encoded = await readAudioAsBase64(uri);
        if (!encoded || encoded.length === 0) {
          setError(CALL_COPY.heardNothing);
          return;
        }

        onUpload(encoded, SPEECH.recorderMimeType);
      })
      .catch(() => {
        setError(CALL_COPY.heardNothing);
      });
  }, [recorder, onUpload]);

  const cancel = React.useCallback(() => {
    if (!wants.current) return;
    wants.current = false;
    setListening(false);
    void recorder.stop().catch(() => undefined);
  }, [recorder]);

  return { isAvailable, isListening, heard: "", error, begin, finish, cancel };
}
