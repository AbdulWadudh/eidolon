import { CHRONICLE, render } from "@eidolon/config";
import { getPrompt } from "@/prompts/store";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { safeJsonParse } from "@/utils/json";

interface ChronicleResponse {
  bullets?: unknown;
}

const CHRONICLE_SCHEMA = {
  name: "chronicle",
  schema: {
    type: "object",
    properties: {
      bullets: {
        type: "array",
        minItems: CHRONICLE.bulletCount,
        maxItems: CHRONICLE.bulletCount,
        items: { type: "string", maxLength: CHRONICLE.maxBulletChars },
      },
    },
    required: ["bullets"],
    additionalProperties: false,
  },
} as const;

function tidy(line: string): string {
  const cleaned = line
    .replace(/^\s*(?:[-•*]\s+|\d+[.)]\s*)/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > CHRONICLE.maxBulletChars
    ? `${cleaned.slice(0, CHRONICLE.maxBulletChars - 1).trimEnd()}…`
    : cleaned;
}

function structuredBullets(raw: string): string[] {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  if (!trimmed.startsWith("{")) return [];

  const parsed = safeJsonParse<ChronicleResponse | null>(trimmed, null);
  return Array.isArray(parsed?.bullets)
    ? parsed.bullets.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function toBullets(raw: string): string[] {
  const structured = structuredBullets(raw);
  const lines = structured.length > 0 ? structured : raw.split(/\r?\n/);

  return lines
    .map(tidy)
    .filter((line) => line.length > 0)
    .slice(0, CHRONICLE.bulletCount)
    .map((line) => `- ${line}`);
}

export function buildChronicleMessages(
  characterName: string,
  messageBatch: string[],
): ChatMessage[] {
  return [
    {
      role: "system",
      content: render(getPrompt("chronicle.system"), {
        name: characterName,
        batchSize: CHRONICLE.batchSize,
        bulletCount: CHRONICLE.bulletCount,
        maxChars: CHRONICLE.maxBulletChars,
      }),
    },
    {
      role: "user",
      content: render(getPrompt("chronicle.user"), {
        transcript: messageBatch.join("\n"),
        bulletCount: CHRONICLE.bulletCount,
      }),
    },
  ];
}

export async function summarizeMessages(
  characterName: string,
  messageBatch: string[],
): Promise<string[]> {
  let raw = "";
  for await (const token of streamChatCompletion(
    buildChronicleMessages(characterName, messageBatch),
    undefined,
    {
      temperature: CHRONICLE.temperature,
      maxTokens: CHRONICLE.maxTokens,
      allowMockFallback: false,
      responseSchema: CHRONICLE_SCHEMA,
    },
  )) {
    raw += token;
  }

  return toBullets(raw);
}
