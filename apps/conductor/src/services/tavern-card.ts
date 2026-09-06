import { CARD_UPLOAD, VOICE } from "@eidolon/config";
import {
  type EidolonMetadata,
  EidolonMetadataSchema,
  type TavernV2CharacterData,
  TavernV2CharacterDataSchema,
} from "@eidolon/protocol";
import text from "png-chunk-text";
import encodeChunks from "png-chunks-encode";
import extractChunks, { type PngChunk } from "png-chunks-extract";
import { safeJsonParse } from "@/utils/json";

export interface TavernLoreEntry {
  keys: string[];
  content: string;
  requiredAffinity: number;
  isActive: boolean;
}

export interface TavernCardData {
  data: TavernV2CharacterData;
  lore: TavernLoreEntry[];
  metadata: EidolonMetadata;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function decodeItxt(data: Uint8Array): { keyword: string; text: string } | null {
  const firstNull = data.indexOf(0);
  if (firstNull <= 0 || data[firstNull + 1] !== 0) return null;

  let cursor = firstNull + 3;
  for (let skipped = 0; skipped < 2; skipped += 1) {
    const nextNull = data.indexOf(0, cursor);
    if (nextNull < 0) return null;
    cursor = nextNull + 1;
  }

  return {
    keyword: Buffer.from(data.subarray(0, firstNull)).toString("latin1"),
    text: Buffer.from(data.subarray(cursor)).toString("utf8"),
  };
}

function readTextChunk(chunk: PngChunk): { keyword: string; text: string } | null {
  try {
    if (chunk.name === "tEXt") return text.decode(chunk.data);
    if (chunk.name === "iTXt") return decodeItxt(chunk.data);
    return null;
  } catch {
    return null;
  }
}

function isCardKeyword(keyword: string): boolean {
  return CARD_UPLOAD.chunkKeywords.some((allowed) => allowed === keyword.toLowerCase());
}

export function readCardJson(pngBuffer: Buffer): unknown {
  const chunks = extractChunks(pngBuffer);

  for (const chunk of chunks) {
    const decoded = readTextChunk(chunk);
    if (!decoded || !isCardKeyword(decoded.keyword)) continue;

    const raw = decoded.text.trim();
    const inflated = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8").trim();
    const parsed = safeJsonParse<unknown>(inflated, null);
    if (parsed !== null) return parsed;
  }

  return null;
}

export function readCardData(raw: unknown): TavernV2CharacterData {
  const root = asRecord(raw);
  const body = asRecord(root.data ?? root);

  return TavernV2CharacterDataSchema.parse({
    name: asString(body.name),
    description: asString(body.description),
    personality: asString(body.personality),
    scenario: asString(body.scenario),
    first_mes: asString(body.first_mes ?? body.greeting),
    mes_example: asString(body.mes_example ?? body.example_dialogue),
    creator_notes: asString(body.creator_notes) || undefined,
    system_prompt: asString(body.system_prompt) || undefined,
    post_history_instructions: asString(body.post_history_instructions) || undefined,
    alternate_greetings: asStrings(body.alternate_greetings),
    character_book: body.character_book ?? body.lorebook,
    tags: asStrings(body.tags),
    creator: asString(body.creator) || undefined,
    character_version: asString(body.character_version) || undefined,
    eidolon_metadata: body.eidolon_metadata,
  });
}

export function readEidolonMetadata(data: TavernV2CharacterData): EidolonMetadata {
  const parsed = EidolonMetadataSchema.safeParse(data.eidolon_metadata ?? {});
  if (parsed.success) {
    return { ...parsed.data, voice_id: parsed.data.voice_id || VOICE.defaultId };
  }
  return { stage_deck: [], affinity_score: 0, voice_id: VOICE.defaultId };
}

function readAffinityGate(extensions: Record<string, unknown>): number {
  const candidate = extensions.eidolon_required_affinity ?? extensions.required_affinity;
  return typeof candidate === "number" && Number.isFinite(candidate) ? Math.trunc(candidate) : 0;
}

export function readLorebook(book: unknown): TavernLoreEntry[] {
  const entries = asRecord(book).entries;
  const rows = Array.isArray(entries) ? entries : Object.values(asRecord(entries));

  return rows
    .map((row) => {
      const entry = asRecord(row);
      const keys = [...asStrings(entry.keys), ...asStrings(entry.secondary_keys)];
      const content = asString(entry.content).trim();
      if (keys.length === 0 || content.length === 0) return null;

      return {
        keys,
        content,
        requiredAffinity: readAffinityGate(asRecord(entry.extensions)),
        isActive: entry.enabled !== false,
      };
    })
    .filter((entry): entry is TavernLoreEntry => entry !== null);
}

export function parseCardBuffer(pngBuffer: Buffer): TavernCardData {
  const raw = readCardJson(pngBuffer);
  if (raw === null) {
    throw new Error("That PNG carries no Tavern character card chunk.");
  }

  const data = readCardData(raw);
  if (data.name.trim().length === 0) {
    throw new Error("The character card in that PNG has no name.");
  }

  return { data, lore: readLorebook(data.character_book), metadata: readEidolonMetadata(data) };
}

export function writeCardChunk(pngBuffer: Buffer, card: unknown): Buffer {
  const kept = extractChunks(pngBuffer).filter((chunk) => {
    const decoded = readTextChunk(chunk);
    return !decoded || !isCardKeyword(decoded.keyword);
  });

  const payload = Buffer.from(JSON.stringify(card), "utf8").toString("base64");
  const chunk = text.encode(CARD_UPLOAD.writeKeyword, payload);
  const endIndex = kept.findIndex((entry) => entry.name === "IEND");
  const at = endIndex < 0 ? kept.length : endIndex;

  return Buffer.from(encodeChunks([...kept.slice(0, at), chunk, ...kept.slice(at)]));
}
