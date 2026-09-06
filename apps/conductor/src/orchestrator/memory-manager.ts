import { RECALL } from "@eidolon/config";
import { embed, embeddingSource } from "@/services/embeddings";
import { insertMemory, type MemorySearchResult, searchMemories } from "@/services/lancedb";

const NEWLINE = String.fromCharCode(10);

export interface ExchangeToRemember {
  characterId: string;
  userText: string;
  assistantText: string;
}

export function formatExchange(userText: string, assistantText: string): string {
  return `Player: ${userText.trim()}${NEWLINE}Them: ${assistantText.trim()}`;
}

export function formatRecall(memories: MemorySearchResult[]): string {
  const lines = memories
    .map((memory) => memory.text.replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0)
    .map((text) =>
      text.length > RECALL.maxSnippetChars ? `${text.slice(0, RECALL.maxSnippetChars)}…` : text,
    )
    .map((text) => `- ${text}`);

  if (lines.length === 0) return "";

  return `${RECALL.header}:${NEWLINE}${lines.join(NEWLINE)}`;
}

export function aboveThreshold(memories: MemorySearchResult[]): MemorySearchResult[] {
  return memories.filter((memory) => memory.score > RECALL.relevanceThreshold);
}

export async function rememberExchange(exchange: ExchangeToRemember): Promise<boolean> {
  const text = formatExchange(exchange.userText, exchange.assistantText);
  if (exchange.assistantText.trim().length === 0) return false;

  try {
    const { vector, source } = await embed(text);
    await insertMemory(exchange.characterId, text, vector, {
      embedding: source,
      recordedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.error("[memory] could not store the exchange", error);
    return false;
  }
}

async function lookUp(characterId: string, query: string): Promise<string> {
  const { vector } = await embed(query);
  const hits = await searchMemories(characterId, vector, RECALL.limit);
  return formatRecall(aboveThreshold(hits));
}

export async function recallMemories(characterId: string, query: string): Promise<string> {
  if (query.trim().length === 0) return "";

  const giveUp = new Promise<string>((resolve) => {
    setTimeout(() => resolve(""), RECALL.timeoutMs);
  });

  try {
    return await Promise.race([lookUp(characterId, query), giveUp]);
  } catch (error) {
    console.error("[memory] recall failed", error);
    return "";
  }
}

export function describeRecall(): string {
  return embeddingSource() === "remote"
    ? "semantic recall is live"
    : "no embedding endpoint, so recall stays silent rather than guessing";
}
