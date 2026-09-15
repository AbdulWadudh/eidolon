import { STORAGE } from "@eidolon/config";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-tables";
import { characters } from "@/db/tables";

const UNOWNED = "unowned";

const emails = new Map<string, string>();
const homes = new Map<string, string>();

export function ownerEmail(characterId: string): string {
  const held = emails.get(characterId);
  if (held !== undefined) return held;

  const [row] = db
    .select({ email: user.email })
    .from(characters)
    .leftJoin(user, eq(characters.ownerId, user.id))
    .where(eq(characters.id, characterId))
    .all();

  const email = row?.email?.trim() || UNOWNED;
  emails.set(characterId, email);
  return email;
}

// Where a character's own art lives. Published art belongs to no one user, so it leaves
// the owner's folder and then stops moving whenever the character changes hands.
export function characterHome(characterId: string): string {
  const held = homes.get(characterId);
  if (held !== undefined) return held;

  const [row] = db
    .select({ email: user.email, isPublic: characters.isPublic })
    .from(characters)
    .leftJoin(user, eq(characters.ownerId, user.id))
    .where(eq(characters.id, characterId))
    .all();

  const home = row?.isPublic === 1 ? STORAGE.publicPrefix : row?.email?.trim() || UNOWNED;
  homes.set(characterId, home);
  return home;
}

export function forgetOwnerEmail(characterId?: string): void {
  if (characterId === undefined) {
    emails.clear();
    homes.clear();
    return;
  }

  emails.delete(characterId);
  homes.delete(characterId);
}

export function userEmail(userId: string): string {
  const [row] = db.select({ email: user.email }).from(user).where(eq(user.id, userId)).all();
  return row?.email?.trim() || UNOWNED;
}
