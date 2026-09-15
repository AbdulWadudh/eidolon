import { and, count, desc, eq, max } from "drizzle-orm";
import { db, ensureCharacter } from "@/db";
import { chronicles } from "@/db/tables";

export interface StoredChronicle {
  id: string;
  chapterIndex: number;
  summaryText: string;
  createdAt: number;
}

const COLUMNS = {
  id: chronicles.id,
  chapterIndex: chronicles.chapterIndex,
  summaryText: chronicles.summaryText,
  createdAt: chronicles.createdAt,
};

const owned = (characterId: string, userId: string) =>
  and(eq(chronicles.characterId, characterId), eq(chronicles.userId, userId));

export function nextChapterIndex(characterId: string, userId: string): number {
  const row = db
    .select({ highest: max(chronicles.chapterIndex) })
    .from(chronicles)
    .where(owned(characterId, userId))
    .get();
  return (row?.highest ?? 0) + 1;
}

export function appendChronicle(
  characterId: string,
  userId: string,
  chapterIndex: number,
  summaryText: string,
): string {
  ensureCharacter(characterId, userId);
  const createdAt = Date.now();

  return db
    .insert(chronicles)
    .values({ characterId, userId, chapterIndex, summaryText, createdAt })
    .onConflictDoUpdate({
      target: [chronicles.characterId, chronicles.userId, chronicles.chapterIndex],
      set: { summaryText, createdAt },
    })
    .returning({ id: chronicles.id })
    .get().id;
}

export function getChronicles(
  characterId: string,
  userId: string,
  limit: number,
): StoredChronicle[] {
  return db
    .select(COLUMNS)
    .from(chronicles)
    .where(owned(characterId, userId))
    .orderBy(desc(chronicles.chapterIndex))
    .limit(limit)
    .all();
}

export function countChronicles(characterId: string, userId: string): number {
  return (
    db.select({ total: count() }).from(chronicles).where(owned(characterId, userId)).get()?.total ??
    0
  );
}

export function updateChronicle(chronicleId: string, summaryText: string, userId: string): boolean {
  return (
    db
      .update(chronicles)
      .set({ summaryText })
      .where(and(eq(chronicles.id, chronicleId), eq(chronicles.userId, userId)))
      .returning({ id: chronicles.id })
      .all().length > 0
  );
}

export function deleteChronicle(chronicleId: string, userId: string): boolean {
  return (
    db
      .delete(chronicles)
      .where(and(eq(chronicles.id, chronicleId), eq(chronicles.userId, userId)))
      .returning({ id: chronicles.id })
      .all().length > 0
  );
}

export function getChronicle(chronicleId: string, userId: string): StoredChronicle | null {
  return (
    db
      .select(COLUMNS)
      .from(chronicles)
      .where(and(eq(chronicles.id, chronicleId), eq(chronicles.userId, userId)))
      .get() ?? null
  );
}
