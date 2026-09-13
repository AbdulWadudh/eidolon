import { STORAGE } from "@eidolon/config";
import type { TavernV2Card } from "@eidolon/protocol";
import { COLORS } from "@eidolon/tokens";
import sharp from "sharp";
import { CARD_UPLOAD, TIMEOUTS_MS } from "@/config";
import { appendMessage, getCharacterMind, setCharacterDefaults } from "@/db";
import { type CharacterCard, createCharacter, getCharacter } from "@/db/characters";
import {
  getCharacterLook,
  getCharacterPigment,
  setCharacterAvatar,
  setCharacterFace,
  setCharacterPigment,
} from "@/db/look";
import { getLoreEntries, upsertLoreEntry } from "@/db/lorebook";
import { listStages, registerStage } from "@/db/stages";
import { forgetFace } from "@/services/selfie";
import { characterKey, isStorageConnected, uploadFile } from "@/services/storage";
import { parseCardBuffer, type TavernCardData, writeCardChunk } from "@/services/tavern-card";

export interface ImportedCard {
  character: CharacterCard;
  loreCount: number;
  anchorUrl: string | null;
  greetingMessageId: string | null;
}

function firstLine(value: string): string {
  const line = value.split(/\r?\n/, 1)[0]?.trim() ?? "";
  return line.length > CARD_UPLOAD.taglineMaxChars
    ? `${line.slice(0, CARD_UPLOAD.taglineMaxChars - 1).trimEnd()}…`
    : line;
}

function joinSections(...sections: string[]): string {
  return sections
    .map((section) => section.trim())
    .filter((section) => section.length > 0)
    .join("\n\n");
}

export function anchorKey(characterId: string): string {
  return characterKey(characterId, STORAGE.imageFolder, CARD_UPLOAD.anchorFilename);
}

async function toWebp(pngBuffer: Buffer): Promise<Buffer> {
  return sharp(pngBuffer).webp({ quality: CARD_UPLOAD.anchorQuality }).toBuffer();
}

async function storeAnchor(characterId: string, pngBuffer: Buffer): Promise<string | null> {
  if (!isStorageConnected()) {
    console.warn("[cards] object storage is offline; the face anchor was not uploaded.");
    return null;
  }

  try {
    const webp = await toWebp(pngBuffer);
    return await uploadFile(anchorKey(characterId), webp, CARD_UPLOAD.anchorContentType);
  } catch (error) {
    console.error("[cards] the face anchor could not be stored", error);
    return null;
  }
}

export async function parseTavernCard(
  pngBuffer: Buffer,
  options: { ownerId?: string | null } = {},
): Promise<ImportedCard> {
  const parsed: TavernCardData = parseCardBuffer(pngBuffer);
  const { data, lore, metadata } = parsed;

  const character = createCharacter({
    ownerId: options.ownerId ?? null,
    name: data.name.trim(),
    tagline: firstLine(data.creator_notes ?? data.description),
    personality: joinSections(data.description, data.personality),
    systemPrompt: data.system_prompt ?? "",
    scenario: data.scenario,
    rules: data.post_history_instructions ?? "",
    exampleDialogue: data.mes_example,
    greeting: data.first_mes,
    voice: metadata.voice_id || undefined,
  });

  const greeting = data.first_mes.trim();
  const greetingMessageId =
    greeting.length > 0 && options.ownerId
      ? appendMessage(character.id, "assistant", greeting, options.ownerId)
      : null;

  for (const entry of lore) {
    upsertLoreEntry(character.id, {
      keys: entry.keys,
      content: entry.content,
      requiredAffinity: entry.requiredAffinity,
      isActive: entry.isActive,
    });
  }

  if (options.ownerId) {
    for (const stageName of metadata.stage_deck) {
      registerStage(character.id, options.ownerId, stageName);
    }
  }

  if (metadata.theme_pigment) {
    setCharacterPigment(character.id, metadata.theme_pigment);
  }

  if (metadata.affinity_score !== 0) {
    setCharacterDefaults(character.id, metadata.affinity_score);
  }

  const anchorUrl = await storeAnchor(character.id, pngBuffer);
  if (anchorUrl) {
    setCharacterAvatar(character.id, anchorUrl);
    setCharacterFace(character.id, anchorUrl);
    forgetFace(character.id);
  }

  return {
    character: getCharacter(character.id) ?? character,
    loreCount: lore.length,
    anchorUrl,
    greetingMessageId,
  };
}

async function readAnchorPng(characterId: string): Promise<Buffer> {
  const look = getCharacterLook(characterId);
  const url = look.faceUrl ?? look.avatarUrl;

  if (url) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
      });
      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > 0) return sharp(bytes).png().toBuffer();
      }
    } catch (error) {
      console.warn("[cards] the stored face could not be read back for export", error);
    }
  }

  return sharp({
    create: {
      width: CARD_UPLOAD.placeholderPx,
      height: CARD_UPLOAD.placeholderPx,
      channels: 3,
      background: COLORS.canvas,
    },
  })
    .png()
    .toBuffer();
}

export function buildTavernCard(characterId: string, userId?: string): TavernV2Card {
  const character = getCharacter(characterId);
  if (!character) throw new Error(`No character "${characterId}" to export.`);

  const mind = getCharacterMind(characterId, null);
  const entries = getLoreEntries(characterId).map((entry, index) => ({
    keys: entry.keys,
    secondary_keys: [] as string[],
    content: entry.content,
    enabled: entry.isActive,
    insertion_order: index,
    case_sensitive: false,
    priority: 10,
    id: index,
    comment: "",
    selective: false,
    constant: false,
    position: "before_char",
    extensions: { eidolon_required_affinity: entry.requiredAffinity },
  }));

  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: character.name,
      description: character.personality,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.greeting,
      mes_example: character.exampleDialogue,
      creator_notes: character.tagline,
      system_prompt: character.systemPrompt,
      post_history_instructions: character.rules,
      alternate_greetings: [],
      character_book: {
        name: `${character.name} lorebook`,
        description: "",
        scan_depth: entries.length,
        token_budget: 0,
        recursive_scanning: false,
        extensions: {},
        entries,
      },
      tags: [],
      creator: "eidolon",
      character_version: "2.0",
      eidolon_metadata: {
        stage_deck: userId ? listStages(characterId, userId).map((stage) => stage.name) : [],
        voice_id: character.voice,
        theme_pigment: getCharacterPigment(characterId) ?? undefined,
        affinity_score: mind.score,
      },
    },
  };
}

export async function exportTavernCard(characterId: string, userId?: string): Promise<Buffer> {
  const card = buildTavernCard(characterId, userId);
  const png = await readAnchorPng(characterId);
  return writeCardChunk(png, card);
}

export function exportFilename(characterId: string): string {
  return `${characterId}.png`;
}
