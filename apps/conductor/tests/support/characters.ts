import { apiPath } from "@eidolon/config";
import { PAIRING_SECRET } from "@/auth";
import { db } from "@/db";

export const BASE = apiPath("characters");
export const AUTHED = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${PAIRING_SECRET}`,
};

const MADE = new Set<string>();

/** Registers a character for teardown, so a failing test cannot leak rows. */
export function remember<T extends { id: string }>(character: T): T {
  MADE.add(character.id);
  return character;
}

export function wipe(): void {
  for (const id of MADE) {
    db.query("DELETE FROM lorebook_entries WHERE character_id = ?").run(id);
    db.query("DELETE FROM messages WHERE character_id = ?").run(id);
    db.query("DELETE FROM characters WHERE id = ?").run(id);
  }
  MADE.clear();
}
