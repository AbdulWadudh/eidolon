import { isPreferredGrade, parseVoiceId, TIMEOUTS_MS, VOICE } from "@eidolon/config";
import { ttsApiUrl } from "@/services/tts";

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  grade: string | null;
  recommended: boolean;
}

interface KokoroVoice {
  id?: unknown;
  name?: unknown;
  overall_grade?: unknown;
}

let cached: { voices: Voice[]; expiresAt: number } | null = null;

export function clearVoiceCache(): void {
  cached = null;
}

export function toVoice(raw: KokoroVoice): Voice | null {
  const id = typeof raw.id === "string" ? raw.id : typeof raw.name === "string" ? raw.name : "";
  if (id.length === 0) return null;

  const grade = typeof raw.overall_grade === "string" ? raw.overall_grade : null;
  const { language, gender, name } = parseVoiceId(id);

  return { id, name, language, gender, grade, recommended: isPreferredGrade(grade) };
}

export function sortVoices(voices: Voice[]): Voice[] {
  return [...voices].sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    if (a.language !== b.language) return a.language.localeCompare(b.language);
    if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
    return a.name.localeCompare(b.name);
  });
}

export async function listVoices(): Promise<Voice[]> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.voices;

  const base = ttsApiUrl();
  if (!base) return [];

  try {
    const res = await fetch(`${base}/audio/voices`, {
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!res.ok) return [];

    const body = (await res.json()) as { voices?: KokoroVoice[] };
    const voices = sortVoices(
      (body.voices ?? []).map(toVoice).filter((voice): voice is Voice => voice !== null),
    );

    cached = { voices, expiresAt: now + VOICE.catalogueTtlMs };
    return voices;
  } catch {
    return [];
  }
}

export async function isKnownVoice(id: string): Promise<boolean> {
  const voices = await listVoices();
  return voices.length === 0 || voices.some((voice) => voice.id === id);
}
