import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

export interface SpeechSubscription {
  remove: () => void;
}

export interface SpeechEvents {
  start: () => void;
  result: (event: ExpoSpeechRecognitionResultEvent) => void;
  error: (event: ExpoSpeechRecognitionErrorEvent) => void;
  end: () => void;
}

export interface SpeechNativeModule {
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  abort: () => void;
  isRecognitionAvailable: () => boolean;
  supportsOnDeviceRecognition: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: <K extends keyof SpeechEvents>(
    event: K,
    listener: SpeechEvents[K],
  ) => SpeechSubscription;
}

let cached: SpeechNativeModule | null | undefined;

export function speechModule(): SpeechNativeModule | null {
  if (cached !== undefined) return cached;

  try {
    const { requireOptionalNativeModule } = require("expo") as {
      requireOptionalNativeModule: (name: string) => SpeechNativeModule | null;
    };
    cached = requireOptionalNativeModule("ExpoSpeechRecognition") ?? null;
  } catch {
    cached = null;
  }

  return cached;
}

export function supportsOnDevice(): boolean {
  const speech = speechModule();
  if (!speech) return false;

  try {
    return speech.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

export function hasDeviceRecogniser(): boolean {
  const speech = speechModule();
  if (!speech) return false;

  try {
    return speech.isRecognitionAvailable();
  } catch {
    return false;
  }
}
