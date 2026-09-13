import { getServicesConfig, isTestEnv } from "@eidolon/config/server";
import { TIMEOUTS_MS } from "@/config";
import { generateMockEmbedding, setMemoryDimensions } from "@/services/lancedb";

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

export type EmbeddingSource = "remote" | "deterministic";

export interface Embedding {
  vector: number[];
  source: EmbeddingSource;
}

let remoteAvailable: boolean | null = null;

export function embeddingSource(): EmbeddingSource {
  return remoteAvailable === true ? "remote" : "deterministic";
}

export function resetEmbeddingProbe(): void {
  remoteAvailable = null;
}

function isUsableVector(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

async function fromRemote(text: string): Promise<number[] | null> {
  const { embeddingsApiUrl, embeddingsModel, llmModel } = getServicesConfig();
  if (!embeddingsApiUrl) return null;

  const res = await fetch(`${embeddingsApiUrl}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: text, model: embeddingsModel || llmModel }),
    signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
  });

  if (!res.ok) return null;

  const body = (await res.json()) as EmbeddingResponse;
  const vector = body.data?.[0]?.embedding;
  return isUsableVector(vector) ? vector : null;
}

export async function embed(text: string): Promise<Embedding> {
  if (isTestEnv()) {
    return { vector: generateMockEmbedding(text), source: "deterministic" };
  }

  if (remoteAvailable !== false) {
    try {
      const vector = await fromRemote(text);
      if (vector) {
        if (remoteAvailable !== true) {
          console.log(`[Embeddings] Live endpoint, ${vector.length} dimensions.`);
        }
        remoteAvailable = true;
        await setMemoryDimensions(vector.length);
        return { vector, source: "remote" };
      }
      remoteAvailable = false;
    } catch {
      remoteAvailable = false;
    }
  }

  return { vector: generateMockEmbedding(text), source: "deterministic" };
}
