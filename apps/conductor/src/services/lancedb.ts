import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MEMORY } from "@eidolon/config";
import { LANCEDB_DIR_PATH } from "@eidolon/config/server";
import * as lancedb from "@lancedb/lancedb";
import { safeJsonParse } from "@/utils/json";

mkdirSync(LANCEDB_DIR_PATH, { recursive: true });

export interface MemoryRecord {
  [key: string]: unknown;
  id: string;
  character_id: string;
  text: string;
  vector: number[];
  timestamp: number;
  metadata: string;
}

export interface MemorySearchResult {
  id: string;
  character_id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

let dbInstance: lancedb.Connection | null = null;
let tableInstance: lancedb.Table | null = null;
let activeDimensions: number = MEMORY.embeddingDimensions;

const TABLE_NAME = MEMORY.tableName;
const DIMENSIONS_PATH = join(LANCEDB_DIR_PATH, MEMORY.dimensionsFile);

function readRecordedDimensions(): number | null {
  try {
    if (!existsSync(DIMENSIONS_PATH)) return null;
    const parsed = safeJsonParse<{ dimensions?: unknown }>(
      readFileSync(DIMENSIONS_PATH, "utf8"),
      {},
    );
    return typeof parsed.dimensions === "number" ? parsed.dimensions : null;
  } catch {
    return null;
  }
}

function recordDimensions(dimensions: number): void {
  try {
    writeFileSync(DIMENSIONS_PATH, JSON.stringify({ dimensions }));
  } catch (error) {
    console.warn("[LanceDB] Could not record the embedding width:", error);
  }
}

export function memoryDimensions(): number {
  return activeDimensions;
}

/**
 * The table's vector width is fixed when it is created, so swapping embedders
 * means rebuilding it. The width in use is recorded beside the data; when the
 * two disagree the old table is dropped rather than left to reject every write.
 */
export async function setMemoryDimensions(dimensions: number): Promise<void> {
  if (dimensions <= 0 || dimensions === activeDimensions) return;
  activeDimensions = dimensions;

  const { db } = await getLanceDb();
  if ((await db.tableNames()).includes(TABLE_NAME)) {
    console.warn(
      `[LanceDB] Embedding width changed to ${dimensions}. Rebuilding "${TABLE_NAME}"; stored memories are dropped.`,
    );
    await db.dropTable(TABLE_NAME);
  }

  tableInstance = null;
  recordDimensions(dimensions);
  await getLanceDb();
}

/**
 * Initializes and retrieves the LanceDB connection and character_memories table.
 */
export async function getLanceDb(): Promise<{ db: lancedb.Connection; table: lancedb.Table }> {
  if (dbInstance && tableInstance) {
    return { db: dbInstance, table: tableInstance };
  }

  if (!dbInstance) {
    const recorded = readRecordedDimensions();
    if (recorded && recorded > 0) activeDimensions = recorded;
    dbInstance = await lancedb.connect(LANCEDB_DIR_PATH);
  }

  const tableNames = await dbInstance.tableNames();

  if (tableNames.includes(TABLE_NAME)) {
    tableInstance = await dbInstance.openTable(TABLE_NAME);
  } else {
    const seedRow: MemoryRecord = {
      id: "schema_init_bootstrap",
      character_id: "__system__",
      text: "bootstrap init",
      vector: new Array<number>(activeDimensions).fill(0),
      timestamp: 0,
      metadata: "{}",
    };
    tableInstance = await dbInstance.createTable(TABLE_NAME, [seedRow]);
    await tableInstance.delete("id = 'schema_init_bootstrap'");
    recordDimensions(activeDimensions);
  }

  return { db: dbInstance, table: tableInstance };
}

/**
 * Generates a deterministic 384-dimensional normalized vector from text.
 * Used for dev/testing when external embedding models are offline.
 */
export function generateMockEmbedding(
  text: string,
  dimensions: number = activeDimensions,
): number[] {
  const dims = dimensions;
  const vector = new Array<number>(dims).fill(0);

  if (!text || text.length === 0) {
    vector[0] = 1.0;
    return vector;
  }

  // Generate deterministic pseudo-random components based on char codes
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < dims; i++) {
    // Linear Congruential Generator step
    hash = Math.imul(hash, 1664525) + 1013904223;
    const charContribution = text.charCodeAt(i % text.length) / 255;
    vector[i] = (hash / 2147483648) * 0.7 + charContribution * 0.3;
  }

  // Normalize to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dims; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dims; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

/**
 * Inserts a new memory vector record for a specific character.
 */
export async function insertMemory(
  characterId: string,
  text: string,
  vector: number[],
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { table } = await getLanceDb();

  const record: MemoryRecord = {
    id: crypto.randomUUID(),
    character_id: characterId,
    text,
    vector,
    timestamp: Date.now(),
    metadata: JSON.stringify(metadata ?? {}),
  };

  await table.add([record]);
}

/**
 * Searches memories for a given character using vector similarity.
 */
/**
 * A table whose manifest points at fragments that are no longer on disk cannot
 * be read again, and a permanently broken table means recall never works for
 * this install. Memories enrich a reply rather than being the source of truth
 * for one, so the last resort is to rebuild empty and carry on.
 */
export async function rebuildMemoryTable(): Promise<void> {
  const { db } = await getLanceDb();
  if ((await db.tableNames()).includes(TABLE_NAME)) {
    await db.dropTable(TABLE_NAME);
  }
  tableInstance = null;
  await getLanceDb();
}

async function withFreshTable<T>(run: (table: lancedb.Table) => Promise<T>): Promise<T> {
  try {
    return await run((await getLanceDb()).table);
  } catch (first) {
    console.warn("[LanceDB] Reopening the memory table after a failed read:", first);
    tableInstance = null;
    dbInstance = null;

    try {
      return await run((await getLanceDb()).table);
    } catch (second) {
      console.error(
        `[LanceDB] "${TABLE_NAME}" cannot be read and is being rebuilt empty. Stored memories are lost.`,
        second,
      );
      await rebuildMemoryTable();
      return run((await getLanceDb()).table);
    }
  }
}

export async function searchMemories(
  characterId: string,
  queryVector: number[],
  limit: number = MEMORY.searchLimit,
): Promise<MemorySearchResult[]> {
  return withFreshTable(async (table) => {
    const results = await table
      .vectorSearch(queryVector)
      .distanceType("cosine")
      .where(`character_id = '${characterId}'`)
      .limit(limit)
      .toArray();

    return results.map((row) => {
      const distance = typeof row._distance === "number" ? row._distance : 1;
      // Cosine distance is 1 - cosine similarity, so the score reads directly as
      // similarity on the 0..1 scale the relevance threshold is written against.
      const score = Math.max(0, Math.min(1, 1 - distance));

      const metadataStr = typeof row.metadata === "string" ? row.metadata : "{}";
      const parsedMetadata = safeJsonParse<Record<string, unknown>>(metadataStr, {});

      return {
        id: String(row.id),
        character_id: String(row.character_id),
        text: String(row.text),
        score,
        metadata: parsedMetadata,
      };
    });
  });
}

/**
 * Checks LanceDB service health.
 */
export async function checkLanceDbHealth(): Promise<boolean> {
  try {
    const { table } = await getLanceDb();
    const count = await table.countRows();
    return typeof count === "number";
  } catch (error) {
    console.error("[LanceDB] Health check failed:", error);
    return false;
  }
}
