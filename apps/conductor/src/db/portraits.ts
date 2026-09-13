import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { characterPortraits } from "@/db/tables";

export interface Portrait {
  id: string;
  url: string;
  prompt: string | null;
  createdAt: number;
}

export function addPortrait(characterId: string, url: string, prompt: string | null): string {
  const id = `portrait:${crypto.randomUUID()}`;

  db.insert(characterPortraits)
    .values({ id, characterId, url, prompt, createdAt: Date.now() })
    .onConflictDoNothing()
    .run();

  return id;
}

export function listPortraits(characterId: string): Portrait[] {
  return db
    .select({
      id: characterPortraits.id,
      url: characterPortraits.url,
      prompt: characterPortraits.prompt,
      createdAt: characterPortraits.createdAt,
    })
    .from(characterPortraits)
    .where(eq(characterPortraits.characterId, characterId))
    .orderBy(desc(characterPortraits.createdAt))
    .all();
}

export function deletePortrait(characterId: string, id: string): boolean {
  return (
    db
      .delete(characterPortraits)
      .where(and(eq(characterPortraits.id, id), eq(characterPortraits.characterId, characterId)))
      .returning({ id: characterPortraits.id })
      .all().length > 0
  );
}
