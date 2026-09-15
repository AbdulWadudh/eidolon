import { getServicesConfig } from "@eidolon/config/server";
import { delay } from "es-toolkit";
import { EventSourceParserStream } from "eventsource-parser/stream";
import { REASONING, TIMEOUTS_MS } from "@/config";
import { canThink, STOP_TOKENS } from "@/services/llm-profile";
import { createReasoningFilter, stripReasoning } from "@/services/reasoning";
import { safeJsonParse } from "@/utils/json";

export interface ChatMessage {
  role: string;
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  topP?: number;
  minP?: number;
  repeatPenalty?: number;
  maxTokens?: number;
  stop?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  allowMockFallback?: boolean;
  responseSchema?: { name: string; schema: unknown };
  think?: boolean;
  onReasoning?: (chunk: string) => void;
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

async function* withoutReasoning(
  tokens: AsyncGenerator<string>,
  holdChars: number,
  onReasoning?: (chunk: string) => void,
): AsyncGenerator<string> {
  const filter = createReasoningFilter(holdChars);

  for await (const token of tokens) {
    const safe = filter.push(token);
    if (safe.length > 0) yield safe;
  }

  const tail = filter.flush();
  if (tail.length > 0) yield tail;

  const thought = filter.reasoning();
  if (thought.length > 0) onReasoning?.(thought);
}

function reasoningHold(options?: CompletionOptions): number {
  return options?.think === true ? REASONING.leadHoldChars : 0;
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  signal?: AbortSignal,
  options?: CompletionOptions,
): AsyncGenerator<string> {
  let spoke = false;
  for await (const token of withoutReasoning(
    streamOnce(messages, signal, options),
    reasoningHold(options),
    options?.onReasoning,
  )) {
    spoke = true;
    yield token;
  }

  if (!spoke && options?.think === true && !signal?.aborted) {
    console.warn("[LLM] The model thought itself into silence; asking again without it.");
    yield* withoutReasoning(
      streamOnce(messages, signal, { ...options, think: false }),
      0,
      options?.onReasoning,
    );
  }
}

async function* streamOnce(
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
        ...(options?.topP === undefined ? {} : { top_p: options.topP }),
        ...(options?.minP === undefined ? {} : { min_p: options.minP }),
        ...(options?.repeatPenalty === undefined ? {} : { repeat_penalty: options.repeatPenalty }),
        ...(options?.maxTokens === undefined ? {} : { max_tokens: options.maxTokens }),
        ...(options?.stop === undefined ? {} : { stop: options.stop }),
        ...(options?.presencePenalty === undefined
          ? {}
          : { presence_penalty: options.presencePenalty }),
        ...(options?.frequencyPenalty === undefined
          ? {}
          : { frequency_penalty: options.frequencyPenalty }),
        ...(canThink()
          ? { chat_template_kwargs: { enable_thinking: options?.think === true } }
          : {}),
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
        choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }>;
      } | null>(event.data, null);

      const delta = parsed?.choices?.[0]?.delta;
      if (delta?.reasoning_content) {
        options?.onReasoning?.(delta.reasoning_content);
        continue;
      }

      const token = delta?.content;
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

function closedThought(): string {
  return canThink() ? `${REASONING.openTag}\n\n${REASONING.closeTag}\n\n` : "";
}

export async function completeText(request: CompletionRequest): Promise<string> {
  let response: Response;

  try {
    response = await fetch(`${LLM_API_URL}/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt: `${request.prompt}${closedThought()}`,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stop: [...STOP_TOKENS, ...(request.stop ?? [])],
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
  return stripReasoning(body.choices?.[0]?.text ?? "");
}
