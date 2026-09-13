import { apiPath, TIMEOUTS_MS } from "@eidolon/config";
import { authedFetch } from "@/store/connection";

export interface PersonaChapter {
  id: string;
  chapterIndex: number;
  title: string | null;
  body: string;
}

export interface Persona {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  hobbies: string | null;
  likes: string | null;
  dislikes: string | null;
  personality: string | null;
  isDefault: boolean;
  updatedAt: number;
  chapters: PersonaChapter[];
}

export type PersonaDraft = Partial<
  Pick<Persona, "name" | "photoUrl" | "bio" | "hobbies" | "likes" | "dislikes" | "personality">
>;

const BASE = apiPath("personas");

async function call<T>(
  host: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T | null> {
  if (!host) return null;

  try {
    const response = await authedFetch(`${host}${path}`, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPersonas(host: string): Promise<Persona[]> {
  const body = await call<{ personas: Persona[] }>(host, BASE);
  return body?.personas ?? [];
}

export async function createPersona(host: string, draft: PersonaDraft): Promise<Persona | null> {
  const body = await call<{ persona: Persona }>(host, BASE, { method: "POST", body: draft });
  return body?.persona ?? null;
}

export async function savePersona(
  host: string,
  personaId: string,
  draft: PersonaDraft,
): Promise<Persona | null> {
  const body = await call<{ persona: Persona }>(host, `${BASE}/${personaId}`, {
    method: "PATCH",
    body: draft,
  });
  return body?.persona ?? null;
}

export async function removePersona(host: string, personaId: string): Promise<Persona[] | null> {
  const body = await call<{ personas: Persona[] }>(host, `${BASE}/${personaId}`, {
    method: "DELETE",
  });
  return body?.personas ?? null;
}

export async function makeDefault(host: string, personaId: string): Promise<Persona[] | null> {
  const body = await call<{ personas: Persona[] }>(host, `${BASE}/${personaId}/default`, {
    method: "POST",
  });
  return body?.personas ?? null;
}

export async function addChapter(
  host: string,
  personaId: string,
  chapter: { title: string | null; body: string },
): Promise<Persona | null> {
  const body = await call<{ persona: Persona }>(host, `${BASE}/${personaId}/chapters`, {
    method: "POST",
    body: chapter,
  });
  return body?.persona ?? null;
}

export async function saveChapter(
  host: string,
  personaId: string,
  chapterId: string,
  patch: { title?: string | null; body?: string },
): Promise<Persona | null> {
  const body = await call<{ persona: Persona }>(
    host,
    `${BASE}/${personaId}/chapters/${chapterId}`,
    { method: "PATCH", body: patch },
  );
  return body?.persona ?? null;
}

export async function removeChapter(
  host: string,
  personaId: string,
  chapterId: string,
): Promise<Persona | null> {
  const body = await call<{ persona: Persona }>(
    host,
    `${BASE}/${personaId}/chapters/${chapterId}`,
    { method: "DELETE" },
  );
  return body?.persona ?? null;
}

export async function pinPersona(
  host: string,
  characterId: string,
  personaId: string | null,
): Promise<boolean> {
  const body = await call<{ personaId: string | null }>(
    host,
    `${apiPath("characters")}/${characterId}/persona`,
    { method: "PUT", body: { personaId } },
  );
  return body !== null;
}

export interface PhotoPick {
  uri: string;
  name: string;
  type: string;
}

export async function uploadPhoto(
  host: string,
  personaId: string,
  pick: PhotoPick,
): Promise<Persona | null> {
  if (!host) return null;

  const form = new FormData();
  form.append("image", { uri: pick.uri, name: pick.name, type: pick.type } as unknown as Blob);

  try {
    const response = await authedFetch(`${host}${BASE}/${personaId}/photo`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TIMEOUTS_MS.transcript),
    });

    if (!response.ok) return null;
    const body = (await response.json()) as { persona: Persona };
    return body.persona ?? null;
  } catch {
    return null;
  }
}

export async function removePhoto(host: string, personaId: string): Promise<Persona | null> {
  const body = await call<{ persona: Persona }>(host, `${BASE}/${personaId}/photo`, {
    method: "DELETE",
  });
  return body?.persona ?? null;
}
