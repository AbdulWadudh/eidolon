import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { db, ensureCharacter } from "@/db";
import { addPortrait } from "@/db/portraits";
import { referencedKeys, storedKey } from "@/services/storage-sweep";

const TEST_USER = "user:storage-sweep";

const BUCKET = "eidolon-media";
const CHARACTER_ID = "storage-sweep-test";

beforeEach(() => {
  db.query("DELETE FROM character_portraits WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
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
    db.query(
      "INSERT INTO messages (id, character_id, role, content, created_at, audio_url, image_url) VALUES (?1, ?2, 'assistant', 'x', ?3, ?4, ?5)",
    ).run(
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
    db.query("UPDATE characters SET avatar_url = ?2 WHERE id = ?1").run(CHARACTER_ID, url);

    expect(referencedKeys(BUCKET).has(`characters/${CHARACTER_ID}/images/face.webp`)).toBe(true);
  });

  it("stops counting a voice note once its message is gone", () => {
    const id = crypto.randomUUID();
    const key = `characters/${CHARACTER_ID}/audio/${id}.mp3`;
    db.query(
      "INSERT INTO messages (id, character_id, role, content, created_at, audio_url) VALUES (?1, ?2, 'assistant', 'x', ?3, ?4)",
    ).run(id, CHARACTER_ID, Date.now(), `http://h/${BUCKET}/${key}`);
    expect(referencedKeys(BUCKET).has(key)).toBe(true);

    db.query("DELETE FROM messages WHERE id = ?").run(id);
    expect(referencedKeys(BUCKET).has(key)).toBe(false);
  });
});

afterAll(() => {
  db.query("DELETE FROM character_portraits WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM messages WHERE character_id = ?").run(CHARACTER_ID);
  db.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
});
