import { TIMEOUTS_MS } from "@eidolon/config";
import { getServicesConfig } from "@eidolon/config/server";
import { delay } from "es-toolkit";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { safeJsonParse } from "@/utils/json";

export interface ChatMessage {
  role: string;
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  allowMockFallback?: boolean;
  responseSchema?: { name: string; schema: unknown };
}

export class LlmUnavailableError extends Error {}

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
  options?: CompletionOptions,
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
        ...(options?.temperature === undefined ? {} : { temperature: options.temperature }),
        ...(options?.maxTokens === undefined ? {} : { max_tokens: options.maxTokens }),
        ...(options?.stop === undefined ? {} : { stop: options.stop }),
        ...(options?.presencePenalty === undefined
          ? {}
          : { presence_penalty: options.presencePenalty }),
        ...(options?.frequencyPenalty === undefined
          ? {}
          : { frequency_penalty: options.frequencyPenalty }),
        ...(options?.responseSchema === undefined
          ? {}
          : {
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: options.responseSchema.name,
                  schema: options.responseSchema.schema,
                },
              },
            }),
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`LLM endpoint returned status ${response.status}`);
    }

    const events = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream());

    for await (const event of events) {
      if (signal?.aborted) break;
      if (event.data === "[DONE]") return;

      const parsed = safeJsonParse<{
        choices?: Array<{ delta?: { content?: string } }>;
      } | null>(event.data, null);

      const token = parsed?.choices?.[0]?.delta?.content;
      if (token) yield token;
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

    if (options?.allowMockFallback === false) {
      throw new LlmUnavailableError(
        error instanceof Error ? error.message : "LLM endpoint unavailable",
      );
    }

    for (const token of MOCK_FALLBACK_TOKENS) {
      if (signal?.aborted) break;
      await delay(25);
      yield token;
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

export interface CompletionRequest {
  prompt: string;
  temperature: number;
  maxTokens: number;
  stop?: string[];
  signal?: AbortSignal;
}

export class CompletionUnsupportedError extends Error {}

/**
 * The raw completion endpoint, without a chat template.
 *
 * A roleplay-tuned model reads any chat turn as something to answer, which makes
 * it useless for text-in/text-out work: asked to rewrite "did you get the job??"
 * it replies that it got the job. Completions carry no such frame, so the model
 * continues the pattern it is shown instead of joining a conversation.
 */
export async function completeText(request: CompletionRequest): Promise<string> {
  let response: Response;

  try {
    response = await fetch(`${LLM_API_URL}/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: request.prompt,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        ...(request.stop === undefined ? {} : { stop: request.stop }),
      }),
      signal: request.signal,
    });
  } catch (error) {
    throw new LlmUnavailableError(
      error instanceof Error ? error.message : "Completion endpoint unreachable",
    );
  }

  if (response.status === 404 || response.status === 501) {
    throw new CompletionUnsupportedError(
      `${LLM_API_URL} does not serve /completions, so text rewriting is unavailable.`,
    );
  }

  if (!response.ok) {
    throw new LlmUnavailableError(`Completion endpoint returned status ${response.status}`);
  }

  const body = (await response.json()) as { choices?: Array<{ text?: string }> };
  return body.choices?.[0]?.text ?? "";
}
