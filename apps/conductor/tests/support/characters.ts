import { apiPath } from "@eidolon/config";
import { db } from "@/db";
import { TEST_TOKEN } from "./session";

export const BASE = apiPath("characters");
export const AUTHED = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${TEST_TOKEN}`,
};

const MADE = new Set<string>();

export function remember<T extends { id: string }>(character: T): T {
  MADE.add(character.id);
  return character;
}

export function wipeNamed(name: string): void {
  const rows = db
    .query<{ id: string }, [string]>("SELECT id FROM characters WHERE name = ?")
    .all(name);
  for (const row of rows) MADE.add(row.id);
  wipe();
}

export function wipe(): void {
  for (const id of MADE) {
    db.query("DELETE FROM lorebook_entries WHERE character_id = ?").run(id);
    db.query("DELETE FROM messages WHERE character_id = ?").run(id);
    db.query("DELETE FROM chronicles WHERE character_id = ?").run(id);
    db.query("DELETE FROM character_portraits WHERE character_id = ?").run(id);
    db.query("DELETE FROM stages WHERE character_id = ?").run(id);
    db.query("DELETE FROM character_state WHERE character_id = ?").run(id);
    db.query("DELETE FROM characters WHERE id = ?").run(id);
  }
  MADE.clear();
}
