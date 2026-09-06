import { describe, expect, it } from "bun:test";
import { CARD_UPLOAD, VOICE } from "@eidolon/config";
import sharp from "sharp";
import {
  parseCardBuffer,
  readCardData,
  readCardJson,
  readEidolonMetadata,
  readLorebook,
  writeCardChunk,
} from "@/services/tavern-card";
import {
  base64Card,
  blankPng,
  CARD_PX,
  cardPng,
  V2_CARD,
  withItxtChunk,
  withTextChunk,
} from "./support/tavern-cards";

describe("readCardJson", () => {
  it("reads a base64 tEXt chunk back out of a PNG", async () => {
    expect(readCardJson(await cardPng())).toEqual(V2_CARD);
  });

  it("reads a chunk another client wrote as plain JSON rather than base64", async () => {
    const png = withTextChunk(await blankPng(), "chara", JSON.stringify(V2_CARD));
    expect(readCardJson(png)).toEqual(V2_CARD);
  });

  it("reads a V3 card stored under the ccv3 keyword", async () => {
    const card = { spec: "chara_card_v3", data: { name: "Threefold", first_mes: "Hello." } };
    const png = withTextChunk(await blankPng(), "ccv3", base64Card(card));
    expect(readCardData(readCardJson(png)).name).toBe("Threefold");
  });

  it("reads a card carried in an uncompressed iTXt chunk", async () => {
    const png = withItxtChunk(await blankPng(), "chara", base64Card(V2_CARD));
    expect(readCardJson(png)).toEqual(V2_CARD);
  });

  it("ignores a text chunk that is not a character card", async () => {
    const png = withTextChunk(await blankPng(), "Software", "Some editor");
    expect(readCardJson(png)).toBeNull();
  });

  it("returns null for a PNG that carries no card", async () => {
    expect(readCardJson(await blankPng())).toBeNull();
  });
});

describe("writeCardChunk", () => {
  it("replaces an existing card rather than stacking a second one", async () => {
    const once = await cardPng();
    const twice = writeCardChunk(once, { ...V2_CARD, data: { ...V2_CARD.data, name: "Renamed" } });
    expect(readCardData(readCardJson(twice)).name).toBe("Renamed");
  });

  it("keeps the written PNG a valid PNG", async () => {
    const meta = await sharp(await cardPng()).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(CARD_PX);
  });

  it("writes under a keyword the reader looks for", () => {
    expect(CARD_UPLOAD.chunkKeywords).toContain(CARD_UPLOAD.writeKeyword);
  });
});

describe("readCardData", () => {
  it("maps every V2 field the prompt builder needs", () => {
    const data = readCardData(V2_CARD);
    expect(data.name).toBe("Marisol Vega");
    expect(data.first_mes).toContain("You are standing on my chart.");
    expect(data.mes_example).toContain("{{char}}: Mm.");
    expect(data.system_prompt).toBe("Stay dry and precise.");
    expect(data.post_history_instructions).toBe("Never break the frame.");
  });

  it("accepts a flat V1 card with no spec wrapper", () => {
    const data = readCardData({
      name: "Flat",
      description: "No wrapper.",
      personality: "Terse.",
      scenario: "",
      first_mes: "Hi.",
      mes_example: "",
    });
    expect(data.name).toBe("Flat");
    expect(data.first_mes).toBe("Hi.");
  });

  it("fills in the fields a scrappier card left out", () => {
    const data = readCardData({ data: { name: "Sparse" } });
    expect(data.description).toBe("");
    expect(data.personality).toBe("");
    expect(data.mes_example).toBe("");
  });

  it("accepts greeting and example_dialogue as aliases", () => {
    const data = readCardData({ name: "Alias", greeting: "Hey.", example_dialogue: "A: b" });
    expect(data.first_mes).toBe("Hey.");
    expect(data.mes_example).toBe("A: b");
  });
});

describe("readEidolonMetadata", () => {
  it("reads the embedded block when the card carries one", () => {
    const metadata = readEidolonMetadata(readCardData(V2_CARD));
    expect(metadata.voice_id).toBe("bf_emma");
    expect(metadata.theme_pigment).toBe("#3B7A9E");
    expect(metadata.affinity_score).toBe(35);
    expect(metadata.stage_deck).toEqual(["Reading room", "Harbour wall"]);
  });

  it("falls back to defaults for a card from another client", () => {
    const metadata = readEidolonMetadata(readCardData({ name: "Plain" }));
    expect(metadata.voice_id).toBe(VOICE.defaultId);
    expect(metadata.stage_deck).toEqual([]);
    expect(metadata.affinity_score).toBe(0);
  });
});

describe("readLorebook", () => {
  it("keeps the entries that can actually trigger", () => {
    const lore = readLorebook(V2_CARD.data.character_book);
    expect(lore).toHaveLength(2);
    expect(lore[0]?.keys).toEqual(["chart", "charts"]);
    expect(lore[0]?.requiredAffinity).toBe(0);
  });

  it("folds secondary keys in beside the primary ones", () => {
    expect(readLorebook(V2_CARD.data.character_book)[1]?.keys).toEqual(["brother", "Tomas"]);
  });

  it("reads the affinity gate out of the entry extensions", () => {
    expect(readLorebook(V2_CARD.data.character_book)[1]?.requiredAffinity).toBe(40);
  });

  it("honours a disabled entry", () => {
    const lore = readLorebook({ entries: [{ keys: ["x"], content: "Hidden.", enabled: false }] });
    expect(lore[0]?.isActive).toBe(false);
  });

  it("reads a lorebook keyed by object rather than array", () => {
    const lore = readLorebook({ entries: { "0": { keys: ["k"], content: "Kept." } } });
    expect(lore).toHaveLength(1);
  });

  it("survives a card with no lorebook at all", () => {
    expect(readLorebook(undefined)).toEqual([]);
    expect(readLorebook({})).toEqual([]);
  });
});

describe("parseCardBuffer", () => {
  it("refuses a PNG with no card chunk", async () => {
    const png = await blankPng();
    expect(() => parseCardBuffer(png)).toThrow(/no Tavern character card/i);
  });

  it("refuses a card with no name", async () => {
    const png = await cardPng({ spec: "chara_card_v2", data: { name: "  " } });
    expect(() => parseCardBuffer(png)).toThrow(/no name/i);
  });

  it("returns the card, its lore and its metadata together", async () => {
    const parsed = parseCardBuffer(await cardPng());
    expect(parsed.data.name).toBe("Marisol Vega");
    expect(parsed.lore).toHaveLength(2);
    expect(parsed.metadata.affinity_score).toBe(35);
  });
});
