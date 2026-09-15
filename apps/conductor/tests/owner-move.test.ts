import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { ensureCharacter, sqlite } from "@/db";
import { getCharacterAvatar, setCharacterAvatar } from "@/db/look";
import { addPortrait } from "@/db/portraits";
import { characterFolder, repointUrls } from "@/services/owner-move";

const TEST_USER = "user:owner-move";
const CHARACTER_ID = "owner-move-test";
const STORAGE_ID = "9f1c2d3e4a5b6c7d8e9f0a1b2c3d4e5f";

const OLD = characterFolder("first@example.com", STORAGE_ID);
const NEW = characterFolder("second@example.com", STORAGE_ID);

const BASE = "https://cdn.example.com/eidolon-media";

beforeEach(() => {
  sqlite.query("DELETE FROM character_portraits WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
  ensureCharacter(CHARACTER_ID, TEST_USER);
});

afterAll(() => {
  sqlite.query("DELETE FROM character_portraits WHERE character_id = ?").run(CHARACTER_ID);
  sqlite.query("DELETE FROM characters WHERE id = ?").run(CHARACTER_ID);
});

describe("handing a character to a new owner", () => {
  it("files media under the new owner but keeps the character's own folder", () => {
    expect(OLD).toBe(`first@example.com/characters/${STORAGE_ID}/`);
    expect(NEW).toBe(`second@example.com/characters/${STORAGE_ID}/`);
  });

  it("repoints every stored url across tables", () => {
    setCharacterAvatar(CHARACTER_ID, `${BASE}/${OLD}images/avatar.webp`);
    addPortrait(CHARACTER_ID, `${BASE}/${OLD}images/portrait.webp`, null);

    repointUrls(OLD, NEW);

    expect(getCharacterAvatar(CHARACTER_ID)).toBe(`${BASE}/${NEW}images/avatar.webp`);
    expect(
      sqlite
        .query<{ url: string }, [string]>(
          "SELECT url FROM character_portraits WHERE character_id = ?",
        )
        .get(CHARACTER_ID)?.url,
    ).toBe(`${BASE}/${NEW}images/portrait.webp`);
  });

  it("leaves another owner's identical filenames alone", () => {
    const other = `${BASE}/third@example.com/characters/other-id/images/avatar.webp`;
    setCharacterAvatar(CHARACTER_ID, other);

    repointUrls(OLD, NEW);

    expect(getCharacterAvatar(CHARACTER_ID)).toBe(other);
  });
});
