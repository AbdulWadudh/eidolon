import { CALL_COPY, SPEECH } from "@eidolon/config";
import type { ExpoSpeechRecognitionErrorEvent } from "expo-speech-recognition";
import * as React from "react";
import { hasDeviceRecogniser, speechModule, supportsOnDevice } from "@/lib/speech-module";

export interface SpeechCapture {
  isAvailable: boolean;
  isListening: boolean;
  heard: string;
  error: string | null;
  begin: () => void;
  finish: () => void;
  cancel: () => void;
}

type Phase = "idle" | "starting" | "listening" | "ended" | "stopping";

export function joinSpoken(settled: string, partial: string): string {
  return [settled, partial]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ");
}

function describe(error: ExpoSpeechRecognitionErrorEvent["error"]): string | null {
  if (error === "aborted" || error === "no-speech") return null;
  if (error === "not-allowed" || error === "service-not-allowed") return CALL_COPY.micDenied;
  return CALL_COPY.heardNothing;
}

export interface SpeechHandlers {
  onCommit: (text: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export function useDeviceSpeech(handlers: SpeechHandlers): SpeechCapture {
  const [isAvailable] = React.useState(hasDeviceRecogniser);
  const [isListening, setListening] = React.useState(false);
  const [heard, setHeard] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const text = React.useRef({ settled: "", partial: "" });
  const phase = React.useRef<Phase>("idle");
  const onDevice = React.useRef(SPEECH.preferOnDevice && supportsOnDevice());
  const granted = React.useRef(false);
  const watchdog = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const bound = React.useRef(handlers);
  const launch = React.useRef<() => void>(() => undefined);
  bound.current = handlers;

  const clearWatchdog = React.useCallback(() => {
    if (watchdog.current === null) return;
    clearTimeout(watchdog.current);
    watchdog.current = null;
  }, []);

  const settle = React.useCallback(
    (deliver: boolean) => {
      clearWatchdog();
      phase.current = "idle";
      setListening(false);

      const spoken = joinSpoken(text.current.settled, text.current.partial);
      text.current = { settled: "", partial: "" };
      if (!deliver) return;

      if (spoken.length < SPEECH.minCommitChars) {
        setError(CALL_COPY.heardNothing);
        setHeard("");
        return;
      }

      bound.current.onCommit(spoken);
    },
    [clearWatchdog],
  );

  React.useEffect(() => {
    const speech = speechModule();
    if (!speech) return;

    const onStart = speech.addListener("start", () => {
      if (phase.current === "starting") phase.current = "listening";
    });

    const onSpeechStart = speech.addListener("speechstart", () => {
      bound.current.onSpeechStart?.();
    });

    const onSpeechEnd = speech.addListener("speechend", () => {
      bound.current.onSpeechEnd?.();
    });

    const onResult = speech.addListener("result", (event) => {
      const transcript = event.results[0]?.transcript ?? "";
      text.current = event.isFinal
        ? { settled: joinSpoken(text.current.settled, transcript), partial: "" }
        : { ...text.current, partial: transcript };
      setHeard(joinSpoken(text.current.settled, text.current.partial));
    });

    const onError = speech.addListener("error", (event) => {
      if (event.error === "language-not-supported" && onDevice.current) {
        onDevice.current = false;
        if (phase.current === "starting" || phase.current === "listening") {
          launch.current();
          return;
        }
      }

      const message = describe(event.error);
      if (message) setError(message);
      settle(false);
    });

    const onEnd = speech.addListener("end", () => {
      if (phase.current === "stopping") {
        settle(true);
        return;
      }
      if (phase.current === "starting" || phase.current === "listening") {
        phase.current = "ended";
        setListening(false);
      }
    });

    return () => {
      onStart.remove();
      onSpeechStart.remove();
      onSpeechEnd.remove();
      onResult.remove();
      onError.remove();
      onEnd.remove();
    };
  }, [settle]);

  const launchSession = React.useCallback(() => {
    const speech = speechModule();
    if (!speech) return;

    try {
      speech.start({
        lang: SPEECH.language,
        interimResults: SPEECH.interimResults,
        continuous: SPEECH.continuous,
        addsPunctuation: SPEECH.addsPunctuation,
        maxAlternatives: SPEECH.maxAlternatives,
        requiresOnDeviceRecognition: onDevice.current,
      });
    } catch {
      setError(CALL_COPY.heardNothing);
      settle(false);
    }
  }, [settle]);

  launch.current = launchSession;

  const begin = React.useCallback(() => {
    const speech = speechModule();
    if (!speech || !isAvailable) return;

    if (phase.current !== "idle") {
      try {
        speech.abort();
      } catch {
        clearWatchdog();
      }
    }

    clearWatchdog();
    setError(null);
    text.current = { settled: "", partial: "" };
    setHeard("");
    phase.current = "starting";
    setListening(true);

    if (granted.current) {
      launchSession();
      return;
    }

    void speech
      .requestPermissionsAsync()
      .then((permission) => {
        granted.current = permission.granted;
        if (!permission.granted) {
          setError(CALL_COPY.micDenied);
          settle(false);
          return;
        }
        if (phase.current === "starting") launchSession();
      })
      .catch(() => {
        setError(CALL_COPY.micDenied);
        settle(false);
      });
  }, [isAvailable, launchSession, settle, clearWatchdog]);

  const finish = React.useCallback(() => {
    if (phase.current === "idle" || phase.current === "stopping") return;

    if (phase.current === "ended") {
      settle(true);
      return;
    }

    phase.current = "stopping";
    try {
      speechModule()?.stop();
    } catch {
      settle(true);
      return;
    }

    clearWatchdog();
    watchdog.current = setTimeout(() => settle(true), SPEECH.commitWatchdogMs);
  }, [settle, clearWatchdog]);

  const cancel = React.useCallback(() => {
    if (phase.current === "idle") return;
    try {
      speechModule()?.abort();
    } catch {
      clearWatchdog();
    }
    setHeard("");
    settle(false);
  }, [settle, clearWatchdog]);

  React.useEffect(() => clearWatchdog, [clearWatchdog]);

  return { isAvailable, isListening, heard, error, begin, finish, cancel };
}
