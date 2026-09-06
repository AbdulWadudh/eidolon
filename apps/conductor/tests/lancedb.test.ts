import { describe, expect, it } from "bun:test";
import {
  checkLanceDbHealth,
  generateMockEmbedding,
  insertMemory,
  memoryDimensions,
  searchMemories,
} from "@/services/lancedb";

describe("LanceDB Vector Memory Engine", () => {
  it("generates a deterministic unit vector as wide as the table", () => {
    const text = "A memory of twilight rain on neon glass";
    const v1 = generateMockEmbedding(text);
    const v2 = generateMockEmbedding(text);

    expect(v1.length).toBe(memoryDimensions());
    expect(v1).toEqual(v2);

    // Verify L2 norm is ~1.0
    let sumSq = 0;
    for (const val of v1) {
      sumSq += val * val;
    }
    expect(Math.abs(Math.sqrt(sumSq) - 1.0)).toBeLessThan(0.001);
  });

  it("produces whatever width the embedder in use asks for", () => {
    expect(generateMockEmbedding("x", 384)).toHaveLength(384);
    expect(generateMockEmbedding("x", 4096)).toHaveLength(4096);
  });

  it("checks database health status", async () => {
    const isHealthy = await checkLanceDbHealth();
    expect(isHealthy).toBe(true);
  });

  it("inserts and retrieves a character memory via vector search", async () => {
    const characterId = `char-test-${crypto.randomUUID().slice(0, 8)}`;
    const memoryText = "User mentioned their favorite color is cobalt blue.";
    const vector = generateMockEmbedding(memoryText);
    const metadata = { category: "preferences", importance: 5 };

    await insertMemory(characterId, memoryText, vector, metadata);

    // Search with identical vector
    const results = await searchMemories(characterId, vector, 3);
    expect(results.length).toBeGreaterThan(0);

    const first = results[0];
    expect(first.character_id).toBe(characterId);
    expect(first.text).toBe(memoryText);
    expect(first.score).toBeGreaterThan(0.9);
    expect(first.metadata).toEqual(metadata);
  });
});
