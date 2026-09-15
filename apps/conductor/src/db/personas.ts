import { DEFAULT_PRONOUNS, isPronounKey } from "@eidolon/config";
import { and, asc, desc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { characters, personaChapters, personas } from "@/db/tables";

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
  pronouns: string;
  isDefault: boolean;
  updatedAt: number;
  chapters: PersonaChapter[];
}

export type PersonaDraft = Partial<
  Pick<
    Persona,
    "name" | "photoUrl" | "bio" | "hobbies" | "likes" | "dislikes" | "personality" | "pronouns"
  >
>;

function chaptersFor(personaId: string): PersonaChapter[] {
  return db
    .select({
      id: personaChapters.id,
      chapterIndex: personaChapters.chapterIndex,
      title: personaChapters.title,
      body: personaChapters.body,
    })
    .from(personaChapters)
    .where(eq(personaChapters.personaId, personaId))
    .orderBy(asc(personaChapters.chapterIndex))
    .all();
}

function shape(row: typeof personas.$inferSelect): Persona {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photoUrl,
    bio: row.bio,
    hobbies: row.hobbies,
    likes: row.likes,
    dislikes: row.dislikes,
    personality: row.personality,
    pronouns: isPronounKey(row.pronouns) ? row.pronouns.trim().toLowerCase() : DEFAULT_PRONOUNS,
    isDefault: row.isDefault === 1,
    updatedAt: row.updatedAt,
    chapters: chaptersFor(row.id),
  };
}

export function listPersonas(userId: string): Persona[] {
  return db
    .select()
    .from(personas)
    .where(eq(personas.userId, userId))
    .orderBy(desc(personas.isDefault), desc(personas.updatedAt))
    .all()
    .map(shape);
}

export function getPersona(personaId: string, userId: string): Persona | null {
  const [row] = db
    .select()
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, userId)))
    .all();

  return row ? shape(row) : null;
}

export function createPersona(userId: string, draft: PersonaDraft): Persona {
  const now = Date.now();

  const isFirst =
    db.select({ id: personas.id }).from(personas).where(eq(personas.userId, userId)).all()
      .length === 0;

  const { id } = db
    .insert(personas)
    .values({
      userId,
      name: draft.name?.trim() || "You",
      photoUrl: draft.photoUrl ?? null,
      bio: draft.bio ?? null,
      hobbies: draft.hobbies ?? null,
      likes: draft.likes ?? null,
      dislikes: draft.dislikes ?? null,
      personality: draft.personality ?? null,
      pronouns: isPronounKey(draft.pronouns) ? draft.pronouns : DEFAULT_PRONOUNS,
      isDefault: isFirst ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: personas.id })
    .get();

  return getPersona(id, userId) as Persona;
}

export function updatePersona(
  personaId: string,
  userId: string,
  draft: PersonaDraft,
): Persona | null {
  if (!getPersona(personaId, userId)) return null;

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  for (const [key, value] of Object.entries(draft)) {
    if (value === undefined) continue;
    if (key === "pronouns" && !isPronounKey(value as string)) continue;
    patch[key] = key === "name" ? (value as string).trim() || "You" : value;
  }

  db.update(personas).set(patch).where(eq(personas.id, personaId)).run();
  return getPersona(personaId, userId);
}

export function deletePersona(personaId: string, userId: string): boolean {
  const held = getPersona(personaId, userId);
  if (!held) return false;

  db.delete(personas).where(eq(personas.id, personaId)).run();
  db.update(characters).set({ personaId: null }).where(eq(characters.personaId, personaId)).run();

  if (held.isDefault) {
    const [next] = db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.userId, userId))
      .orderBy(desc(personas.updatedAt))
      .all();

    if (next) makeDefaultPersona(next.id, userId);
  }

  return true;
}

export function makeDefaultPersona(personaId: string, userId: string): Persona | null {
  if (!getPersona(personaId, userId)) return null;

  db.update(personas).set({ isDefault: 0 }).where(eq(personas.userId, userId)).run();
  db.update(personas).set({ isDefault: 1 }).where(eq(personas.id, personaId)).run();

  return getPersona(personaId, userId);
}

export function defaultPersona(userId: string): Persona | null {
  const [row] = db
    .select()
    .from(personas)
    .where(and(eq(personas.userId, userId), eq(personas.isDefault, 1)))
    .all();

  return row ? shape(row) : null;
}

export function personaForCharacter(characterId: string, userId: string): Persona | null {
  const [row] = db
    .select({ personaId: characters.personaId })
    .from(characters)
    .where(eq(characters.id, characterId))
    .all();

  const pinned = row?.personaId ? getPersona(row.personaId, userId) : null;
  return pinned ?? defaultPersona(userId);
}

export function pinPersonaToCharacter(
  characterId: string,
  userId: string,
  personaId: string | null,
): boolean {
  if (personaId !== null && !getPersona(personaId, userId)) return false;

  db.update(characters).set({ personaId }).where(eq(characters.id, characterId)).run();
  return true;
}

export function addChapter(
  personaId: string,
  userId: string,
  title: string | null,
  body: string,
): Persona | null {
  if (!getPersona(personaId, userId)) return null;

  const [highest] = db
    .select({ top: max(personaChapters.chapterIndex) })
    .from(personaChapters)
    .where(eq(personaChapters.personaId, personaId))
    .all();

  db.insert(personaChapters)
    .values({
      personaId,
      chapterIndex: (highest?.top ?? 0) + 1,
      title,
      body,
      createdAt: Date.now(),
    })
    .run();

  return getPersona(personaId, userId);
}

export function updateChapter(
  chapterId: string,
  personaId: string,
  userId: string,
  patch: { title?: string | null; body?: string },
): Persona | null {
  if (!getPersona(personaId, userId)) return null;

  const fields: Record<string, unknown> = {};
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.body !== undefined) fields.body = patch.body;
  if (Object.keys(fields).length === 0) return getPersona(personaId, userId);

  db.update(personaChapters)
    .set(fields)
    .where(and(eq(personaChapters.id, chapterId), eq(personaChapters.personaId, personaId)))
    .run();

  return getPersona(personaId, userId);
}

export function deleteChapter(
  chapterId: string,
  personaId: string,
  userId: string,
): Persona | null {
  if (!getPersona(personaId, userId)) return null;

  db.delete(personaChapters)
    .where(and(eq(personaChapters.id, chapterId), eq(personaChapters.personaId, personaId)))
    .run();

  return getPersona(personaId, userId);
}
