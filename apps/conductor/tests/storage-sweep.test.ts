import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { ensureCharacter, sqlite } from "@/db";
import { createCharacter } from "@/db/characters";
import { createPersona, deletePersona } from "@/db/personas";
import { addPortrait } from "@/db/portraits";
import { namesForKeys } from "@/services/storage-browse";
import { referencedKeys, storedKey, sweepStorage } from "@/services/storage-sweep";

const TEST_USER = "user:storage-sweep";

const BUCKET = "eidolon-media";
const CHARACTER_ID = "storage-sweep-test";

beforeEach(() => {
  sqlite.query("DELETE FROM character_portraits WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
  ensureCharacter(CHARACTER_ID, TEST_USER);
});

describe("storedKey", () => {
  it("reads the key out of a public url", () => {
    expect(storedKey(`http://127.0.0.1:9000/${BUCKET}/characters/emma/audio/a.mp3`, BUCKET)).toBe(
      "characters/emma/audio/a.mp3",
    );
  });

  it("ignores the cache-busting marker a remade voice note carries", () => {
    expect(
      storedKey(`http://127.0.0.1:9000/${BUCKET}/characters/emma/audio/a.mp3?v=mtzs8iu6`, BUCKET),
    ).toBe("characters/emma/audio/a.mp3");
  });

  it("still matches a url written when the host was different", () => {
    expect(storedKey(`http://192.168.1.39:9000/${BUCKET}/images/emma/old.webp`, BUCKET)).toBe(
      "images/emma/old.webp",
    );
  });

  it("undoes the escaping a character id with a space would have picked up", () => {
    expect(storedKey(`http://h/${BUCKET}/characters/ines%20vaz/images/a.webp`, BUCKET)).toBe(
      "characters/ines vaz/images/a.webp",
    );
  });

  it("takes a bare key as written", () => {
    expect(storedKey("characters/emma/audio/a.mp3", BUCKET)).toBe("characters/emma/audio/a.mp3");
  });

  it("refuses a url that points somewhere else entirely", () => {
    expect(storedKey("https://example.com/somebody/else.png", BUCKET)).toBeNull();
    expect(storedKey("", BUCKET)).toBeNull();
    expect(storedKey(null, BUCKET)).toBeNull();
  });
});

describe("referencedKeys", () => {
  it("counts a voice note and a photo hanging off a message", () => {
    const id = crypto.randomUUID();
    sqlite
      .query(
        "INSERT INTO messages (id, character_id, role, content, created_at, audio_url, image_url) VALUES (?1, ?2, 'assistant', 'x', ?3, ?4, ?5)",
      )
      .run(
        id,
        CHARACTER_ID,
        Date.now(),
        `http://h/${BUCKET}/characters/${CHARACTER_ID}/audio/${id}.mp3`,
        `http://h/${BUCKET}/characters/${CHARACTER_ID}/images/${id}.webp`,
      );

    const keys = referencedKeys(BUCKET);
    expect(keys.has(`characters/${CHARACTER_ID}/audio/${id}.mp3`)).toBe(true);
    expect(keys.has(`characters/${CHARACTER_ID}/images/${id}.webp`)).toBe(true);
  });

  it("counts a portrait the gallery still lists", () => {
    addPortrait(CHARACTER_ID, `http://h/${BUCKET}/characters/${CHARACTER_ID}/images/p.webp`, null);

    expect(referencedKeys(BUCKET).has(`characters/${CHARACTER_ID}/images/p.webp`)).toBe(true);
  });

  it("counts the portrait and the avatar separately when they are the same file", () => {
    const url = `http://h/${BUCKET}/characters/${CHARACTER_ID}/images/face.webp`;
    addPortrait(CHARACTER_ID, url, null);
    sqlite.query("UPDATE characters SET avatar_url = ?2 WHERE id = ?1").run(CHARACTER_ID, url);

    expect(referencedKeys(BUCKET).has(`characters/${CHARACTER_ID}/images/face.webp`)).toBe(true);
  });

  it("stops counting a voice note once its message is gone", () => {
    const id = crypto.randomUUID();
    const key = `characters/${CHARACTER_ID}/audio/${id}.mp3`;
    sqlite
      .query(
        "INSERT INTO messages (id, character_id, role, content, created_at, audio_url) VALUES (?1, ?2, 'assistant', 'x', ?3, ?4)",
      )
      .run(id, CHARACTER_ID, Date.now(), `http://h/${BUCKET}/${key}`);
    expect(referencedKeys(BUCKET).has(key)).toBe(true);

    sqlite.query("DELETE FROM messages WHERE id = ?").run(id);
    expect(referencedKeys(BUCKET).has(key)).toBe(false);
  });
});

afterAll(() => {
  sqlite.query("DELETE FROM character_portraits WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
});

describe("reading a bucket laid out by uuid", () => {
  it("names the characters whose folders are in the keys", () => {
    const made = createCharacter({ name: "Storage Named" });

    const names = namesForKeys([
      `someone@example.com/characters/${made.id}/portraits/a.webp`,
      `someone@example.com/characters/${made.id}/audio/b.mp3`,
      "public/characters/not-a-character/c.webp",
      "someone@example.com/personas/persona-1/d.webp",
    ]);

    expect(names[made.id]).toBe("Storage Named");
    expect(names["not-a-character"]).toBeUndefined();
    expect(Object.keys(names)).toHaveLength(1);

    sqlite.query("DELETE FROM characters WHERE id = ?").run(made.id);
  });

  it("says nothing when no key names a character", () => {
    expect(namesForKeys(["someone@example.com/personas/p/a.webp"])).toEqual({});
  });
});

describe("naming a persona's folder", () => {
  it("shows the persona by name, the way a character's folder is", () => {
    const persona = createPersona(TEST_USER, { name: "Storage Persona" });

    const names = namesForKeys([`someone@example.com/personas/${persona.id}/photo.webp`]);

    expect(names[persona.id]).toBe("Storage Persona");

    deletePersona(persona.id, TEST_USER);
  });
});

describe("what the scan reports", () => {
  it("counts everything unreferenced, and separately what is old enough to take", async () => {
    const report = await sweepStorage({ dryRun: true });

    expect(report.orphans.length).toBeLessThanOrEqual(report.unreferenced.length);
    for (const object of report.orphans) {
      expect(report.unreferenced.some((one) => one.key === object.key)).toBe(true);
    }
  });
});
