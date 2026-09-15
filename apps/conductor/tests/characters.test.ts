import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { getCharacterCard } from "@/db";
import { createCharacter, getCharacter, listCharacters, updateCharacter } from "@/db/characters";
import { app } from "@/index";
import { loadPrompts } from "@/prompts/store";
import { buildSystemPrompt } from "@/services/persona";
import { portraitKey } from "@/services/storage";
import { AUTHED, BASE, remember, wipe } from "./support/characters";

const TEST_USER = "user:characters";

beforeEach(async () => {
  await loadPrompts();
});

afterEach(wipe);

describe("naming a new character", () => {
  it("mints an id with nothing of the name in it", () => {
    const created = remember(createCharacter({ name: "Ada Lovelace" }));

    // A uuid is hex, so it can spell a short word by chance — what matters is that the
    // name was never turned into the id.
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(created.id).not.toBe("ada-lovelace");
  });

  it("gives two characters of the same name ids of their own", () => {
    const first = remember(createCharacter({ name: "Ada Lovelace" }));
    const second = remember(createCharacter({ name: "Ada Lovelace" }));

    expect(first.id).not.toBe(second.id);
  });

  it("keeps media under one folder no matter what the character is renamed to", () => {
    const created = remember(createCharacter({ name: "Ada Lovelace" }));
    const key = portraitKey(created.id, "portrait.webp");

    updateCharacter(created.id, { name: "Bea Ravenna" });

    expect(portraitKey(created.id, "portrait.webp")).toBe(key);
    expect(key).not.toInclude("ada-lovelace");
    expect(key).not.toInclude("bea-ravenna");
  });
});

describe("creating and editing", () => {
  it("stores every field the card carries", () => {
    const created = remember(
      createCharacter({
        name: "Ines",
        tagline: "keeps a bakery",
        personality: "warm, blunt",
        systemPrompt: "You never mention the war.",
        scenario: "You share a flat above the bakery.",
        rules: "Never swear.",
        exampleDialogue: "PLAYER: morning\nINES: *yawns* morning, you.",
        greeting: "You're up early.",
      }),
    );

    const read = getCharacter(created.id);
    expect(read?.name).toBe("Ines");
    expect(read?.scenario).toContain("bakery");
    expect(read?.rules).toBe("Never swear.");
    expect(read?.exampleDialogue).toContain("INES:");
    expect(read?.greeting).toBe("You're up early.");
  });

  it("lists what was made", () => {
    const created = remember(createCharacter({ name: "Roster Test" }));
    expect(listCharacters().some((entry) => entry.id === created.id)).toBe(true);
  });

  it("rejects a nameless character over HTTP", async () => {
    const res = await app.request(BASE, {
      method: "POST",
      headers: AUTHED,
      body: JSON.stringify({ tagline: "no name" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates and then edits over HTTP", async () => {
    const response = await app.request(BASE, {
      method: "POST",
      headers: AUTHED,
      body: JSON.stringify({ name: "Http Made", personality: "curious" }),
    });
    const created = (await response.json()) as {
      character: { id: string; personality: string };
    };

    remember(created.character);
    expect(created.character.personality).toBe("curious");

    const patched = await app.request(`${BASE}/${created.character.id}`, {
      method: "PATCH",
      headers: AUTHED,
      body: JSON.stringify({ rules: "Never lie." }),
    });
    expect(patched.status).toBe(200);
    expect(getCharacter(created.character.id)?.rules).toBe("Never lie.");
  });

  it("answers 404 for a character that does not exist", async () => {
    expect((await app.request(`${BASE}/nobody-here`, { headers: AUTHED })).status).toBe(404);
    const patched = await app.request(`${BASE}/nobody-here`, {
      method: "PATCH",
      headers: AUTHED,
      body: JSON.stringify({ rules: "x" }),
    });
    expect(patched.status).toBe(404);
  });
});

describe("the card reaches the prompt", () => {
  it("injects scenario, rules and example dialogue", () => {
    const created = remember(
      createCharacter({
        name: "Prompted",
        personality: "dry",
        scenario: "A rainy Tuesday in Lisbon.",
        rules: "Never mention the dog.",
        exampleDialogue: "PLAYER: hi\nPROMPTED: *nods* hi.",
      }),
    );

    const system = buildSystemPrompt({
      ...getCharacterCard(created.id, TEST_USER),
      mood: "Warm",
      tier: "Close",
    });

    expect(system).toContain("A rainy Tuesday in Lisbon.");
    expect(system).toContain("Never mention the dog.");
    expect(system).toContain("PROMPTED: *nods* hi.");
  });

  it("leaves the block out entirely when a field is blank", () => {
    const created = remember(createCharacter({ name: "Bare", personality: "plain" }));
    const system = buildSystemPrompt({
      ...getCharacterCard(created.id, TEST_USER),
      mood: "Warm",
      tier: "Close",
    });

    expect(system).not.toContain("Where things stand between you");
    expect(system).not.toContain("Things you always or never do");
  });
});

describe("lorebook over HTTP", () => {
  it("writes an entry and reads it back", async () => {
    const created = remember(createCharacter({ name: "Lore Owner" }));

    const posted = await app.request(`${BASE}/${created.id}/lore`, {
      method: "POST",
      headers: AUTHED,
      body: JSON.stringify({
        keys: ["pendant"],
        content: "It was her mother's.",
        requiredAffinity: 40,
      }),
    });
    expect(posted.status).toBe(201);

    const listed = await app.request(`${BASE}/${created.id}/lore`, { headers: AUTHED });
    const read = (await listed.json()) as {
      lore: Array<{ keys: string[]; requiredAffinity: number }>;
    };

    expect(read.lore).toHaveLength(1);
    expect(read.lore[0]?.keys).toEqual(["pendant"]);
    expect(read.lore[0]?.requiredAffinity).toBe(40);
  });

  it("refuses an entry with no keyword or no content", async () => {
    const created = remember(createCharacter({ name: "Lore Guard" }));

    for (const body of [
      { keys: [], content: "x" },
      { keys: ["k"], content: "  " },
    ]) {
      const res = await app.request(`${BASE}/${created.id}/lore`, {
        method: "POST",
        headers: AUTHED,
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
    }
  });
});
