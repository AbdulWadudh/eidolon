import { TIMEOUTS_MS } from "@eidolon/config";
import { getServicesConfig } from "@eidolon/config/server";
import { delay } from "es-toolkit";
import { safeJsonParse } from "@/utils/json";

export interface ChatMessage {
  role: string;
  content: string;
}

export const LLM_API_URL = getServicesConfig().llmApiUrl;
export const LLM_MODEL = getServicesConfig().llmModel;

const MOCK_FALLBACK_TOKENS = [
  "*looks",
  " up",
  " softly*",
  " It",
  " seems",
  " my",
  " local",
  " brain",
  " is",
  " offline,",
  " but",
  " I",
  " can",
  " still",
  " hear",
  " you.",
];

/**
 * Streams chat completion tokens from an OpenAI-compatible endpoint.
 * Gracefully falls back to mock roleplay tokens if the endpoint is offline or fails.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  try {
    const response = await fetch(`${LLM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`LLM endpoint returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      if (signal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed?.startsWith("data:")) continue;

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(dataStr) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            yield token;
          }
        } catch {
          // Ignore malformed chunk lines
        }
      }
    }
  } catch (error) {
    if (signal?.aborted) {
      return;
    }
    console.warn(
      `[LLM Adapter] Unable to reach ${LLM_API_URL}: ${
        error instanceof Error ? error.message : String(error)
      }. Entering fallback mock mode.`,
    );

    for (const token of MOCK_FALLBACK_TOKENS) {
      if (signal?.aborted) break;
      await delay(25);
      yield `${token} `;
    }
  }
}

/**
 * Safely extracts typed structured JSON output from an LLM response string.
 */
export function extractStructuredOutput<T>(raw: string, fallback: T): T {
  return safeJsonParse<T>(raw, fallback);
}

/**
 * Health check for the LLM endpoint.
 */
export async function checkLlmHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS_MS.serviceHealth);

    const res = await fetch(`${LLM_API_URL}/models`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
