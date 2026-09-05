import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { checkDatabaseHealth, db } from "@/db";
import { SQLITE_DB_PATH } from "@/utils/paths";

describe("SQLite relational store", () => {
  it("opens the database file at the external OS data path", () => {
    expect(db.filename).toBe(SQLITE_DB_PATH);
    expect(existsSync(SQLITE_DB_PATH)).toBe(true);
  });

  it("reports healthy", () => {
    expect(checkDatabaseHealth()).toBe(true);
  });

  it("creates the relational schema", () => {
    const tables = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => row.name);

    expect(tables).toContain("characters");
    expect(tables).toContain("messages");
    expect(tables).toContain("stages");
  });

  it("round-trips a character and cascades its messages on delete", () => {
    const characterId = `char-test-${crypto.randomUUID().slice(0, 8)}`;

    try {
      db.query("INSERT INTO characters (id, name, tagline, created_at) VALUES (?, ?, ?, ?)").run(
        characterId,
        "Test Subject",
        "A row that should not survive the test",
        Date.now(),
      );

      db.query(
        "INSERT INTO messages (id, character_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(crypto.randomUUID(), characterId, "user", "hello", Date.now());

      const stored = db
        .query<{ name: string; affinity_tier: string }, [string]>(
          "SELECT name, affinity_tier FROM characters WHERE id = ?",
        )
        .get(characterId);

      expect(stored?.name).toBe("Test Subject");
      // Default from the schema, not from the insert.
      expect(stored?.affinity_tier).toBe("Neutral");

      db.query("DELETE FROM characters WHERE id = ?").run(characterId);

      const orphans = db
        .query<{ count: number }, [string]>(
          "SELECT COUNT(*) as count FROM messages WHERE character_id = ?",
        )
        .get(characterId);

      expect(orphans?.count).toBe(0);
    } finally {
      db.query("DELETE FROM characters WHERE id = ?").run(characterId);
    }
  });
});
