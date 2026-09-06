export const SENTENCE_BUFFER = {
  boundaries: [".", "!", "?", "\n", "—"] as readonly string[],
  trailing: ['"', "'", ")", "]", "”", "’"] as readonly string[],
  minSpeakableChars: 2,
  maxBufferChars: 320,
} as const;

export const KOKORO = {
  model: "kokoro",
  speechPath: "/audio/speech",
  defaultVoice: "af_bella",
  responseFormat: "mp3",
  timeoutMs: 12000,
  maxSentenceChars: 400,
} as const;

export const SILENT_MP3 = {
  seconds: 0.5,
  frameHeader: [0xff, 0xfb, 0x90, 0xc0] as readonly number[],
  frameBytes: 417,
  samplesPerFrame: 1152,
  sampleRate: 44100,
} as const;

export const MP3_SCAN = {
  id3v2Marker: [0x49, 0x44, 0x33] as readonly number[],
  id3v1Marker: [0x54, 0x41, 0x47] as readonly number[],
  id3v2HeaderBytes: 10,
  id3v1Bytes: 128,
  resyncWindowBytes: 8192,
} as const;

export const CARD_UPLOAD = {
  fieldNames: ["card", "file", "image", "png"] as readonly string[],
  maxBytes: 12 * 1024 * 1024,
  anchorFilename: "avatar_anchor.webp",
  anchorContentType: "image/webp",
  anchorQuality: 90,
  exportContentType: "image/png",
  chunkKeywords: ["chara", "ccv3"] as readonly string[],
  writeKeyword: "chara",
  placeholderPx: 512,
  taglineMaxChars: 90,
} as const;

export const CALL = {
  avatarPx: 120,
  avatarBorderPx: 2,
  ringCount: 4,
  ringBasePx: 138,
  ringStepPx: 24,
  ringWidthPx: 2,
  ringRestScale: 1,
  ringPeakScale: 1.45,
  ringRestOpacity: 0.1,
  ringPeakOpacity: 0.55,
  muteButtonPx: 56,
  interruptButtonPx: 72,
  endButtonPx: 56,
  subtitleMinHeightPx: 92,
  subtitleMaxHeightPx: 168,
  subtitleMaxLines: 4,
  amplitudeAttack: 0.55,
  amplitudeRelease: 0.12,
  amplitudeFloor: 0.05,
  amplitudeGain: 2.6,
  sampleStride: 8,
  queueLimit: 24,
  cacheDirectory: "eidolon-call",
  unmeteredLevel: 0.72,
} as const;

export const CALL_MS = {
  amplitudeSettle: 90,
  durationTick: 1000,
  subtitleFade: 220,
} as const;

export const SPEECH = {
  language: "en-US",
  interimResults: true,
  continuous: true,
  preferOnDevice: true,
  commitWatchdogMs: 4000,
  autoListen: true,
  endpointSilenceMs: 900,
  reopenDelayMs: 400,
  addsPunctuation: true,
  maxAlternatives: 1,
  minCommitChars: 2,
  androidSilenceMs: 10000,
  androidMinLengthMs: 800,
  commitGraceMs: 700,
  recorderExtension: "m4a",
  recorderMimeType: "audio/m4a",
  maxUploadBytes: 8 * 1024 * 1024,
} as const;

export type SpeechMode = "device" | "server" | "unavailable";

export const TRANSCRIBE = {
  model: "whisper-1",
  path: "/audio/transcriptions",
  responseFormat: "json",
  language: "en",
  timeoutMs: 30000,
  maxChars: 1200,
  formField: "file",
  filename: "turn.m4a",
} as const;

export const CALL_COPY = {
  titleSuffix: "Voice Call",
  speaking: "is speaking…",
  listening: "Listening to you…",
  thinking: "Thinking…",
  connecting: "Reaching her…",
  offline: "The conductor is not reachable.",
  subtitlePlaceholder: "Whatever she says next appears here.",
  back: "Back to the chat",
  speakerOn: "Speaker on",
  speakerOff: "Speaker off",
  mute: "Mute the microphone",
  unmute: "Unmute the microphone",
  interrupt: "Cut in",
  endCall: "End the call",
  muted: "Muted",
  tapToTalk: "Tap to talk",
  justTalk: "Just talk",
  cutInHint: "Cut in while she is speaking",
  micOpen: "Your microphone is open",
  micGated: "Muted while she speaks",
  tapToSend: "Tap to send",
  startTalking: "Start talking",
  sendWhatYouSaid: "Send what you said",
  hearing: "Listening…",
  heardNothing: "That did not come through. Hold and try again.",
  micDenied: "Eidolon needs the microphone to hear you.",
  noRecogniser: "This device has no speech recognition, and no transcription node is configured.",
  transcribing: "Working out what you said…",
  yourTurn: "You",
} as const;

export const IMPORT_COPY = {
  action: "Import Tavern Card",
  blurb: "A V2 character card PNG brings her portrait, greeting and lorebook with it.",
  picking: "Choosing a card…",
  uploading: "Reading the card…",
  failed: "That PNG carried no character card.",
  offline: "Pair with a conductor before importing a card.",
  succeeded: "Imported",
} as const;

export function silentMp3FrameCount(): number {
  const frameSeconds = SILENT_MP3.samplesPerFrame / SILENT_MP3.sampleRate;
  return Math.ceil(SILENT_MP3.seconds / frameSeconds);
}

export function isSentenceBoundary(character: string): boolean {
  return SENTENCE_BUFFER.boundaries.some((boundary) => boundary === character);
}

export function isSentenceTrailing(character: string): boolean {
  return SENTENCE_BUFFER.trailing.some((trailing) => trailing === character);
}

export function callTitle(characterName: string): string {
  return `${characterName} • ${CALL_COPY.titleSuffix}`;
}

export function callSpeakingLine(characterName: string): string {
  return `${characterName} ${CALL_COPY.speaking}`;
}

export function callDurationLabel(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
