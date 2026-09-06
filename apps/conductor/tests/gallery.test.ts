import { afterEach, describe, expect, it } from "bun:test";
import { appendMessage, db, setMessageImage } from "@/db";
import { createCharacter } from "@/db/characters";
import { countGallery, listGallery } from "@/db/gallery";
import { setCharacterAvatar, setCharacterFace } from "@/db/look";
import { addPortrait, listPortraits } from "@/db/portraits";
import { app } from "@/index";
import { BASE, remember, wipe } from "./support/characters";

afterEach(wipe);

function withPhotos(name: string, count: number): string {
  const character = remember(createCharacter({ name }));

  for (let index = 0; index < count; index += 1) {
    const messageId = appendMessage(character.id, "assistant", `line ${index}`);
    setMessageImage(
      messageId,
      `https://media.test/${character.id}-${index}.png`,
      `caption ${index}`,
    );
  }

  return character.id;
}

describe("what the gallery collects", () => {
  it("finds every photo she sent, newest first", () => {
    const id = withPhotos("Gallery Photos", 3);

    const images = listGallery(id, 10);
    expect(images).toHaveLength(3);
    expect(images.every((image) => image.kind === "photo")).toBe(true);
    expect(images[0]?.caption).toBe("caption 2");
    expect(countGallery(id)).toBe(3);
  });

  it("ignores a message that carries no picture", () => {
    const character = remember(createCharacter({ name: "Gallery Talk Only" }));
    appendMessage(character.id, "assistant", "just talking");

    expect(listGallery(character.id, 10)).toHaveLength(0);
    expect(countGallery(character.id)).toBe(0);
  });

  it("includes her portrait and her backdrops alongside the photos", () => {
    const id = withPhotos("Gallery Mixed", 1);
    addPortrait(id, "https://media.test/avatar.png", null);
    setCharacterAvatar(id, "https://media.test/avatar.png");
    db.query(
      "INSERT INTO stages (id, character_id, name, backdrop_url) VALUES (?1, ?2, ?3, ?4)",
    ).run(`${id}-stage`, id, "The kitchen", "https://media.test/backdrop.png");

    const kinds = listGallery(id, 10).map((image) => image.kind);
    expect(kinds).toContain("photo");
    expect(kinds).toContain("portrait");
    expect(kinds).toContain("backdrop");
    expect(countGallery(id)).toBe(3);
  });

  it("does not list the same picture twice when it is both avatar and face", () => {
    const character = remember(createCharacter({ name: "Gallery Same Face" }));
    addPortrait(character.id, "https://media.test/one.png", null);
    addPortrait(character.id, "https://media.test/one.png", null);
    setCharacterAvatar(character.id, "https://media.test/one.png");
    setCharacterFace(character.id, "https://media.test/one.png");

    expect(countGallery(character.id)).toBe(1);
  });

  it("keeps a portrait that is no longer in use", () => {
    const character = remember(createCharacter({ name: "Gallery Old Faces" }));
    addPortrait(character.id, "https://media.test/first.png", "in a red coat");
    setCharacterAvatar(character.id, "https://media.test/first.png");

    // A second render replaces which one is in use, not the first one itself.
    addPortrait(character.id, "https://media.test/second.png", null);
    setCharacterAvatar(character.id, "https://media.test/second.png");

    const portraits = listGallery(character.id, 10).filter((i) => i.kind === "portrait");
    expect(portraits).toHaveLength(2);
    expect(portraits.map((i) => i.url)).toContain("https://media.test/first.png");
    expect(listPortraits(character.id)).toHaveLength(2);
  });

  it("marks which portrait is currently her profile picture", () => {
    const character = remember(createCharacter({ name: "Gallery Which One" }));
    addPortrait(character.id, "https://media.test/old.png", null);
    addPortrait(character.id, "https://media.test/new.png", null);
    setCharacterAvatar(character.id, "https://media.test/new.png");

    const images = listGallery(character.id, 10);
    expect(images.find((i) => i.url.endsWith("new.png"))?.isAvatar).toBe(true);
    expect(images.find((i) => i.url.endsWith("old.png"))?.isAvatar).toBe(false);
  });

  it("keeps one character's pictures out of another's", () => {
    const mine = withPhotos("Gallery Mine", 2);
    const theirs = withPhotos("Gallery Theirs", 5);

    expect(countGallery(mine)).toBe(2);
    expect(countGallery(theirs)).toBe(5);
    expect(listGallery(mine, 10).every((image) => image.url.includes("gallery-mine"))).toBe(true);
  });

  it("pages without repeating or skipping", () => {
    const id = withPhotos("Gallery Paged", 7);

    const first = listGallery(id, 3, 0);
    const second = listGallery(id, 3, 3);
    const third = listGallery(id, 3, 6);

    const ids = [...first, ...second, ...third].map((image) => image.id);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });
});

describe("the gallery over HTTP", () => {
  it("returns the page and the true total", async () => {
    const id = withPhotos("Gallery Http", 5);

    const res = await app.request(`${BASE}/${id}/gallery?limit=2`);
    const body = (await res.json()) as { images: unknown[]; total: number };

    expect(res.status).toBe(200);
    expect(body.images).toHaveLength(2);
    expect(body.total).toBe(5);
  });

  it("caps a caller asking for everything at once", async () => {
    const id = withPhotos("Gallery Greedy", 2);

    const res = await app.request(`${BASE}/${id}/gallery?limit=99999`);
    const body = (await res.json()) as { images: unknown[] };

    expect(res.status).toBe(200);
    expect(body.images).toHaveLength(2);
  });

  it("answers for a character with nothing rather than failing", async () => {
    const character = remember(createCharacter({ name: "Gallery Empty" }));

    const res = await app.request(`${BASE}/${character.id}/gallery`);
    const body = (await res.json()) as { images: unknown[]; total: number };

    expect(res.status).toBe(200);
    expect(body.total).toBe(0);
    expect(body.images).toHaveLength(0);
  });
});
