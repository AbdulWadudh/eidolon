import { characterPortraitUrl, charactersUrl, characterUrl, TIMEOUTS_MS } from "@eidolon/config";

export interface CharacterCard {
  id: string;
  name: string;
  tagline: string;
  personality: string;
  systemPrompt: string;
  scenario: string;
  rules: string;
  exampleDialogue: string;
  greeting: string;
  voice: string;
}

export interface CharacterSummary extends CharacterCard {
  avatarUrl: string | null;
  affinity: number;
  tier: string;
  mood: string;
  messageCount: number;
  createdAt: number;
}

export interface Preset {
  key: string;
  label: string;
  blurb: string;
  name: string;
  tagline: string;
  voice: string;
}

function signal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUTS_MS.clientRequest);
}

export async function fetchCharacters(host: string): Promise<CharacterSummary[]> {
  if (!host) return [];

  try {
    const res = await fetch(charactersUrl(host), { signal: signal() });
    if (!res.ok) return [];
    const body = (await res.json()) as { characters: CharacterSummary[] };
    return body.characters;
  } catch {
    return [];
  }
}

export async function fetchPresets(host: string): Promise<Preset[]> {
  if (!host) return [];

  try {
    const res = await fetch(`${charactersUrl(host)}/presets`, { signal: signal() });
    if (!res.ok) return [];
    const body = (await res.json()) as { presets: Preset[] };
    return body.presets;
  } catch {
    return [];
  }
}

/**
 * The portrait is queued rather than rendered here, so this returns as soon as
 * the character exists. Her face arrives on the roster a minute or so later.
 */
export async function createFromPreset(
  host: string,
  key: string,
  name?: string,
): Promise<CharacterCard | null> {
  try {
    const res = await fetch(`${charactersUrl(host)}/presets/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(name ? { name } : {}),
      signal: signal(),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { character: CharacterCard };
    return body.character;
  } catch {
    return null;
  }
}

export async function createCharacter(
  host: string,
  draft: Partial<CharacterCard> & { name: string },
): Promise<CharacterCard | null> {
  try {
    const res = await fetch(charactersUrl(host), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
      signal: signal(),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { character: CharacterCard };
    return body.character;
  } catch {
    return null;
  }
}

export async function updateCharacter(
  host: string,
  id: string,
  patch: Partial<CharacterCard>,
): Promise<CharacterCard | null> {
  try {
    const res = await fetch(characterUrl(host, id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      signal: signal(),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { character: CharacterCard };
    return body.character;
  } catch {
    return null;
  }
}

export async function deleteCharacter(host: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(characterUrl(host, id), { method: "DELETE", signal: signal() });
    return res.ok;
  } catch {
    return false;
  }
}

export async function requestPortrait(host: string, id: string, prompt: string): Promise<boolean> {
  try {
    const res = await fetch(characterPortraitUrl(host, id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: signal(),
    });
    return res.ok;
  } catch {
    return false;
  }
}
