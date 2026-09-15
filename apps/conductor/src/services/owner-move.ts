import { QUEUE_JOBS, STORAGE } from "@eidolon/config";
import { sql } from "drizzle-orm";
import { STORAGE_SWEEP } from "@/config";
import { db } from "@/db";
import { forgetOwnerEmail, ownerEmail } from "@/db/owner";
import { enqueueUploadJob } from "@/queue/queues";
import { copyFile, listKeys } from "@/services/storage";

export function characterFolder(email: string, characterId: string): string {
  return `${email}/${STORAGE.characterPrefix}/${characterId}/`;
}

export function portraitFolder(email: string, characterId: string): string {
  return `${characterFolder(email, characterId)}${STORAGE.portraitFolder}/`;
}

export function publicFolder(characterId: string): string {
  return characterFolder(STORAGE.publicPrefix, characterId);
}
function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export function repointUrls(from: string, to: string): void {
  for (const source of STORAGE_SWEEP.sources) {
    for (const column of source.columns) {
      const table = sql.raw(`"${source.table}"`);
      const field = sql.raw(`"${column}"`);

      try {
        db.run(
          sql`UPDATE ${table} SET ${field} = replace(${field}, ${from}, ${to}) WHERE ${field} LIKE ${`%${from}%`}`,
        );
      } catch (error) {
        console.error(
          `[owner-move] could not repoint ${source.table}.${column}: ${describe(error)}`,
        );
      }
    }
  }
}

/**
 * Moves one folder onto another and repoints every stored url that named the old one.
 * Nothing is deleted: the originals stay readable until the storage sweep reclaims them,
 * so a copy that fails part-way leaves every url still pointing at a live object.
 */
export async function relocateFolder(from: string, to: string): Promise<number> {
  if (from === to) return 0;

  const keys = await listKeys(from);
  for (const key of keys) {
    await copyFile(key, `${to}${key.slice(from.length)}`);
  }

  // Only once every object has landed, so no url can name a key that is not there yet.
  if (keys.length > 0) repointUrls(from, to);

  return keys.length;
}

/**
 * A character changing hands moves her own art and nothing else. Conversations are not
 * transferred, so every photo and voice note stays filed under the user who made it.
 */
export async function relocateCharacterMedia(
  characterId: string,
  fromEmail: string,
  toEmail: string,
): Promise<number> {
  return relocateFolder(
    portraitFolder(fromEmail, characterId),
    portraitFolder(toEmail, characterId),
  );
}

/**
 * Publishing lifts a character's art out of her owner's folder into the shared one, so a
 * later handover moves nothing and anyone who forked her keeps a url that still resolves.
 */
export async function publishCharacterMedia(characterId: string): Promise<number> {
  const from = portraitFolder(ownerEmail(characterId), characterId);
  forgetOwnerEmail(characterId);

  return relocateFolder(from, publicFolder(characterId));
}
export function queueOwnerRelocation(characterId: string, fromEmail: string): void {
  forgetOwnerEmail(characterId);

  const toEmail = ownerEmail(characterId);
  if (toEmail === fromEmail) return;

  void enqueueUploadJob(QUEUE_JOBS.relocateCharacterMedia, {
    characterId,
    fromEmail,
    toEmail,
  }).catch((error) => {
    console.error(`[owner-move] ${characterId} stays under ${fromEmail}: ${describe(error)}`);
  });
}
