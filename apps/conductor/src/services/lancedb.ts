import { mkdirSync } from "node:fs";
import * as lancedb from "@lancedb/lancedb";
import { safeJsonParse } from "@/utils/json";
import { LANCEDB_DIR_PATH } from "@/utils/paths";

// External to the repository, alongside the SQLite file - see src/utils/paths.ts.
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

const TABLE_NAME = "character_memories";

/**
 * Initializes and retrieves the LanceDB connection and character_memories table.
 */
export async function getLanceDb(): Promise<{ db: lancedb.Connection; table: lancedb.Table }> {
  if (dbInstance && tableInstance) {
    return { db: dbInstance, table: tableInstance };
  }

  dbInstance = await lancedb.connect(LANCEDB_DIR_PATH);
  const tableNames = await dbInstance.tableNames();

  if (tableNames.includes(TABLE_NAME)) {
    tableInstance = await dbInstance.openTable(TABLE_NAME);
  } else {
    // Initialize schema with a zeroed bootstrap row, then delete it or keep clean
    const seedRow: MemoryRecord = {
      id: "schema_init_bootstrap",
      character_id: "__system__",
      text: "bootstrap init",
      vector: new Array(384).fill(0),
      timestamp: 0,
      metadata: "{}",
    };
    tableInstance = await dbInstance.createTable(TABLE_NAME, [seedRow]);
    // Remove the bootstrap record so table is empty
    await tableInstance.delete("id = 'schema_init_bootstrap'");
  }

  return { db: dbInstance, table: tableInstance };
}

/**
 * Generates a deterministic 384-dimensional normalized vector from text.
 * Used for dev/testing when external embedding models are offline.
 */
export function generateMockEmbedding(text: string): number[] {
  const dims = 384;
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
export async function searchMemories(
  characterId: string,
  queryVector: number[],
  limit = 5,
): Promise<MemorySearchResult[]> {
  const { table } = await getLanceDb();

  // LanceDB vectorSearch with SQL filter by character_id
  const results = await table
    .vectorSearch(queryVector)
    .where(`character_id = '${characterId}'`)
    .limit(limit)
    .toArray();

  return results.map((row) => {
    const distance = typeof row._distance === "number" ? row._distance : 0;
    // Normalized similarity score: 1 / (1 + distance)
    const score = 1 / (1 + Math.max(0, distance));

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
