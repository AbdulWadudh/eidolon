import text from "png-chunk-text";
import encodeChunks from "png-chunks-encode";
import extractChunks from "png-chunks-extract";
import sharp from "sharp";
import { writeCardChunk } from "@/services/tavern-card";

export const V2_CARD = {
  spec: "chara_card_v2",
  spec_version: "2.0",
  data: {
    name: "Marisol Vega",
    description: "A cartographer who draws coastlines she has never seen.",
    personality: "Dry, watchful, allergic to small talk.",
    scenario: "The reading room of a shuttered maritime library.",
    first_mes: "*she does not look up* You are standing on my chart.",
    mes_example: "<START>\n{{user}}: Hello.\n{{char}}: Mm.",
    creator_notes: "Cartographer with a grudge against the sea.",
    system_prompt: "Stay dry and precise.",
    post_history_instructions: "Never break the frame.",
    character_book: {
      name: "Marisol lore",
      entries: [
        {
          keys: ["chart", "charts"],
          content: "Her charts are all of places she has only read about.",
          enabled: true,
          extensions: {},
        },
        {
          keys: ["brother"],
          secondary_keys: ["Tomas"],
          content: "Her brother Tomas drowned off Cabo de Gata.",
          enabled: true,
          extensions: { eidolon_required_affinity: 40 },
        },
        {
          keys: [],
          content: "Dropped: no keyword to trigger on.",
        },
        {
          keys: ["silent"],
          content: "",
        },
      ],
    },
    eidolon_metadata: {
      stage_deck: ["Reading room", "Harbour wall"],
      voice_id: "bf_emma",
      theme_pigment: "#3B7A9E",
      affinity_score: 35,
    },
  },
} as const;

export const CARD_PX = 8;

export async function blankPng(): Promise<Buffer> {
  return sharp({
    create: { width: CARD_PX, height: CARD_PX, channels: 3, background: "#101014" },
  })
    .png()
    .toBuffer();
}

export async function cardPng(card: unknown = V2_CARD): Promise<Buffer> {
  return writeCardChunk(await blankPng(), card);
}

function spliceBeforeEnd(pngBuffer: Buffer, chunk: { name: string; data: Uint8Array }): Buffer {
  const chunks = extractChunks(pngBuffer);
  const at = chunks.findIndex((entry) => entry.name === "IEND");
  return Buffer.from(encodeChunks([...chunks.slice(0, at), chunk, ...chunks.slice(at)]));
}

export function withTextChunk(pngBuffer: Buffer, keyword: string, content: string): Buffer {
  return spliceBeforeEnd(pngBuffer, text.encode(keyword, content));
}

export function withItxtChunk(pngBuffer: Buffer, keyword: string, content: string): Buffer {
  const data = Buffer.concat([
    Buffer.from(keyword, "latin1"),
    Buffer.from([0, 0, 0]),
    Buffer.from([0]),
    Buffer.from([0]),
    Buffer.from(content, "utf8"),
  ]);
  return spliceBeforeEnd(pngBuffer, { name: "iTXt", data: new Uint8Array(data) });
}

export function base64Card(card: unknown): string {
  return Buffer.from(JSON.stringify(card), "utf8").toString("base64");
}
