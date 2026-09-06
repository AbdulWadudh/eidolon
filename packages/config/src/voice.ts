/**
 * A Kokoro voice id encodes where the voice is from and who it sounds like:
 * the first letter is the language, the second the gender, then the name.
 * "af_heart" is American, female, Heart.
 */
export const VOICE_LANGUAGES: Record<string, string> = {
  a: "American English",
  b: "British English",
  e: "Spanish",
  f: "French",
  h: "Hindi",
  i: "Italian",
  j: "Japanese",
  p: "Portuguese",
  z: "Mandarin",
};

export const VOICE_GENDERS: Record<string, string> = {
  f: "Female",
  m: "Male",
};

export const VOICE = {
  defaultId: "af_heart",
  previewLine: "Hey. It's me. This is what I sound like.",
  previewMaxChars: 120,
  catalogueTtlMs: 30 * 60 * 1000,
  // The grades Kokoro publishes. Anything at or above this is offered first,
  // because most of the catalogue is markedly worse than the handful at the top.
  preferredGrades: ["A", "A-", "B+", "B", "B-"],
  unknownLanguage: "Other",
  unknownGender: "Voice",
} as const;

export const VOICE_COPY = {
  title: "Voice",
  subtitle: "How she sounds when she sends a voice note.",
  search: "Search voices",
  preview: "Play a sample",
  previewing: "Playing",
  empty: "No voices matched.",
  unavailable: "The voice service is not reachable.",
  recommended: "Recommended",
  allVoices: "All voices",
  gradeLabel: "Quality",
} as const;

export interface ParsedVoiceId {
  language: string;
  gender: string;
  name: string;
}

function titleCase(value: string): string {
  return value.length === 0 ? value : value[0]?.toUpperCase() + value.slice(1);
}

export function parseVoiceId(id: string): ParsedVoiceId {
  const [prefix = "", rest = ""] = id.split("_", 2);
  const language = VOICE_LANGUAGES[prefix[0] ?? ""] ?? VOICE.unknownLanguage;
  const gender = VOICE_GENDERS[prefix[1] ?? ""] ?? VOICE.unknownGender;

  return { language, gender, name: titleCase(rest.replace(/[-_]+/g, " ")) || id };
}

export function voiceLabel(id: string): string {
  const { name, gender, language } = parseVoiceId(id);
  return `${name} · ${gender}, ${language}`;
}

export function isPreferredGrade(grade: string | null): boolean {
  if (!grade) return false;
  return VOICE.preferredGrades.some((allowed) => allowed === grade);
}
