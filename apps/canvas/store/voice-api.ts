import { TIMEOUTS_MS, voicePreviewUrl, voicesUrl } from "@eidolon/config";

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  grade: string | null;
  recommended: boolean;
}

export interface VoiceCatalogue {
  voices: Voice[];
  defaultVoice: string;
}

export async function fetchVoices(host: string): Promise<VoiceCatalogue | null> {
  if (!host) return null;

  try {
    const res = await fetch(voicesUrl(host), {
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!res.ok) return null;
    return (await res.json()) as VoiceCatalogue;
  } catch {
    return null;
  }
}

/**
 * The sample arrives as base64 rather than a URL because it is generated on
 * demand and never stored. A data URI hands it straight to the player without a
 * round trip through the filesystem.
 */
export async function fetchVoicePreview(host: string, voiceId: string): Promise<string | null> {
  if (!host) return null;

  try {
    const res = await fetch(voicePreviewUrl(host, voiceId), {
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest * 4),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { data?: string; format?: string };
    if (!body.data) return null;

    return `data:audio/${body.format ?? "mp3"};base64,${body.data}`;
  } catch {
    return null;
  }
}

export function matchesSearch(voice: Voice, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;

  return [voice.name, voice.language, voice.gender, voice.id].some((field) =>
    field.toLowerCase().includes(needle),
  );
}
