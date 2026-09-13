import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-tables";
import { characters } from "@/db/tables";

const UNOWNED = "unowned";

const emails = new Map<string, string>();

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

export function forgetOwnerEmail(characterId?: string): void {
  if (characterId === undefined) emails.clear();
  else emails.delete(characterId);
}
