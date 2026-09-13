import { characterPortraitUrl, charactersUrl, characterUrl, TIMEOUTS_MS } from "@eidolon/config";
import type { AvatarCropRect } from "@/store/chat-photos";
import { authedFetch } from "@/store/connection";

export interface CharacterCard {
  id: string;
  ownerId?: string | null;
  isPublic?: boolean;
  forkedFrom?: string | null;
  name: string;
  tagline: string;
  personality: string;
  systemPrompt: string;
  scenario: string;
  rules: string;
  exampleDialogue: string;
  greeting: string;
  likes: string;
  dislikes: string;
  voice: string;
  pronouns: string;
}

export interface CharacterSummary extends CharacterCard {
  personaId?: string | null;
  avatarUrl: string | null;
  avatarCrop: AvatarCropRect | null;
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
  pronouns: string;
}

function signal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUTS_MS.clientRequest);
}

export async function fetchCharacters(host: string): Promise<CharacterSummary[]> {
  if (!host) return [];

  const res = await authedFetch(charactersUrl(host), { signal: signal() });
  if (!res.ok) throw new Error(`The conductor said ${res.status}.`);

  const body = (await res.json()) as { characters: CharacterSummary[] };
  return body.characters;
}

export async function fetchPresets(host: string): Promise<Preset[]> {
  if (!host) return [];

  try {
    const res = await authedFetch(`${charactersUrl(host)}/presets`, { signal: signal() });
    if (!res.ok) return [];
    const body = (await res.json()) as { presets: Preset[] };
    return body.presets;
  } catch {
    return [];
  }
}

export async function createFromPreset(
  host: string,
  key: string,
  name?: string,
): Promise<CharacterCard | null> {
  try {
    const res = await authedFetch(`${charactersUrl(host)}/presets/${key}`, {
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
    const res = await authedFetch(charactersUrl(host), {
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

export interface SaveResult {
  character: CharacterCard;
  forked: boolean;
}

export async function saveCharacter(
  host: string,
  id: string,
  patch: Partial<CharacterCard>,
): Promise<SaveResult | null> {
  try {
    const res = await authedFetch(characterUrl(host, id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      signal: signal(),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { character: CharacterCard; forked?: boolean };
    return { character: body.character, forked: body.forked === true };
  } catch {
    return null;
  }
}

export async function publishCharacter(
  host: string,
  id: string,
  isPublic: boolean,
): Promise<CharacterCard | null> {
  try {
    const res = await authedFetch(`${characterUrl(host, id)}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic }),
      signal: signal(),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { character: CharacterCard };
    return body.character;
  } catch {
    return null;
  }
}

export interface FetchedCharacter {
  card: CharacterCard;
  isMine: boolean;
}

export async function fetchCharacter(host: string, id: string): Promise<FetchedCharacter | null> {
  try {
    const res = await authedFetch(characterUrl(host, id), { signal: signal() });
    if (!res.ok) return null;
    const body = (await res.json()) as { character: CharacterCard; isMine?: boolean };
    return { card: body.character, isMine: body.isMine === true };
  } catch {
    return null;
  }
}

export async function deleteCharacter(host: string, id: string): Promise<boolean> {
  try {
    const res = await authedFetch(characterUrl(host, id), { method: "DELETE", signal: signal() });
    return res.ok;
  } catch {
    return false;
  }
}

export async function requestPortrait(host: string, id: string, prompt: string): Promise<boolean> {
  try {
    const res = await authedFetch(characterPortraitUrl(host, id), {
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

export async function requestMoment(
  host: string,
  characterId: string,
  place: string,
): Promise<string | null> {
  if (!host) return null;

  try {
    const res = await authedFetch(`${characterUrl(host, characterId)}/moment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place }),
      signal: signal(),
    });

    if (res.ok) return null;

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return body.error ?? "That did not work.";
  } catch {
    return "Could not reach your Eidolon.";
  }
}
