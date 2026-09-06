import { afterEach, describe, expect, it } from "bun:test";
import { VOICE } from "@eidolon/config";
import { TavernV2CardSchema } from "@eidolon/protocol";
import { getCharacterMind, getTranscript } from "@/db";
import { getCharacter } from "@/db/characters";
import { getCharacterPigment } from "@/db/look";
import { getLoreEntries } from "@/db/lorebook";
import { listStages } from "@/db/stages";
import { buildTavernCard, exportFilename, parseTavernCard } from "@/services/card-parser";
import { readLorebook, writeCardChunk } from "@/services/tavern-card";
import { remember, wipe } from "./support/characters";
import { blankPng, cardPng, V2_CARD } from "./support/tavern-cards";

async function importCard(card: unknown = V2_CARD) {
  const result = await parseTavernCard(await cardPng(card));
  remember(result.character);
  return result;
}

afterEach(() => {
  wipe();
});

describe("parseTavernCard", () => {
  it("maps the card onto the SQLite schema", async () => {
    const imported = await importCard();
    const stored = getCharacter(imported.character.id);

    expect(stored?.name).toBe("Marisol Vega");
    expect(stored?.tagline).toBe("Cartographer with a grudge against the sea.");
    expect(stored?.personality).toContain("cartographer who draws coastlines");
    expect(stored?.personality).toContain("allergic to small talk");
    expect(stored?.scenario).toBe(V2_CARD.data.scenario);
    expect(stored?.exampleDialogue).toBe(V2_CARD.data.mes_example);
    expect(stored?.rules).toBe("Never break the frame.");
    expect(stored?.systemPrompt).toBe("Stay dry and precise.");
    expect(stored?.voice).toBe("bf_emma");
  });

  it("writes the greeting in as message zero", async () => {
    const imported = await importCard();
    const transcript = getTranscript(imported.character.id, 10);

    expect(transcript).toHaveLength(1);
    expect(transcript[0]?.role).toBe("assistant");
    expect(transcript[0]?.content).toBe(V2_CARD.data.first_mes);
    expect(imported.greetingMessageId).toBe(transcript[0]?.id ?? null);
  });

  it("writes the embedded lorebook into lorebook_entries", async () => {
    const imported = await importCard();

    expect(imported.loreCount).toBe(2);
    const lore = getLoreEntries(imported.character.id);
    expect(lore.map((entry) => entry.requiredAffinity)).toEqual([0, 40]);
    expect(lore[1]?.keys).toEqual(["brother", "Tomas"]);
  });

  it("adopts the stage deck, pigment and affinity from the eidolon block", async () => {
    const imported = await importCard();
    const id = imported.character.id;

    expect(listStages(id).map((stage) => stage.name)).toEqual(["Reading room", "Harbour wall"]);
    expect(getCharacterPigment(id)).toBe("#3B7A9E");
    expect(getCharacterMind(id).score).toBe(35);
  });

  it("gives two cards with the same name two ids", async () => {
    const first = await importCard();
    const second = await importCard();
    expect(second.character.id).not.toBe(first.character.id);
  });

  it("imports a card from another client without an eidolon block", async () => {
    const imported = await importCard({
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: { name: "Plainwood", description: "Nothing fancy.", first_mes: "Hello." },
    });

    expect(getCharacter(imported.character.id)?.voice).toBe(VOICE.defaultId);
    expect(getLoreEntries(imported.character.id)).toEqual([]);
    expect(getCharacterPigment(imported.character.id)).toBeNull();
  });

  it("imports a card that carries no greeting at all", async () => {
    const imported = await importCard({ spec: "chara_card_v2", data: { name: "Mute" } });
    expect(imported.greetingMessageId).toBeNull();
    expect(getTranscript(imported.character.id, 10)).toEqual([]);
  });

  it("reports the anchor as absent when object storage is offline", async () => {
    expect((await importCard()).anchorUrl).toBeNull();
  });
});

describe("buildTavernCard", () => {
  it("round-trips a character back into a valid V2 card", async () => {
    const imported = await importCard();
    const card = buildTavernCard(imported.character.id);

    expect(TavernV2CardSchema.safeParse(card).success).toBe(true);
    expect(card.data.name).toBe("Marisol Vega");
    expect(card.data.first_mes).toBe(V2_CARD.data.first_mes);
    expect(card.data.eidolon_metadata?.affinity_score).toBe(35);
    expect(card.data.eidolon_metadata?.voice_id).toBe("bf_emma");
    expect(card.data.eidolon_metadata?.theme_pigment).toBe("#3B7A9E");
    expect(card.data.eidolon_metadata?.stage_deck).toEqual(["Reading room", "Harbour wall"]);
  });

  it("carries the lorebook and its affinity gates back out", async () => {
    const imported = await importCard();
    const entries = readLorebook(buildTavernCard(imported.character.id).data.character_book);

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.requiredAffinity)).toEqual([0, 40]);
  });

  it("survives a re-import of what it exported", async () => {
    const imported = await importCard();
    const exported = writeCardChunk(await blankPng(), buildTavernCard(imported.character.id));
    const reimported = remember((await parseTavernCard(exported)).character);

    expect(reimported.name).toBe("Marisol Vega");
    expect(getLoreEntries(reimported.id)).toHaveLength(2);
    expect(getCharacterMind(reimported.id).score).toBe(35);
  });

  it("refuses to build a card for a character that does not exist", () => {
    expect(() => buildTavernCard("nobody-at-all")).toThrow(/No character/);
  });

  it("names the download after the character", () => {
    expect(exportFilename("marisol-vega")).toBe("marisol-vega.png");
  });
});
