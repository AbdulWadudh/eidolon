import { IMAGE } from "@eidolon/config";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";

const PROMPT_WRITER_SYSTEM =
  "You write prompts for an image generator. You are not a character and you never speak as one. You never use asterisks, quotation marks, questions or first person. You reply with one line of comma separated visual phrases and nothing else.";

const NOT_A_PROMPT = /[*?"]|(^|\s)(i|i'm|my|me|you|your|we)(\s|$)/i;

export function isPromptLike(text: string): boolean {
  return text.length > 0 && !NOT_A_PROMPT.test(text);
}

export async function ask(
  prompt: string,
  temperature: number,
  signal?: AbortSignal,
  responseSchema?: { name: string; schema: unknown },
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: PROMPT_WRITER_SYSTEM },
    { role: "user", content: prompt },
  ];
  let raw = "";
  for await (const token of streamChatCompletion(messages, signal, {
    temperature,
    maxTokens: IMAGE.promptMaxTokens,
    allowMockFallback: false,
    responseSchema,
  })) {
    raw += token;
    if (raw.length > IMAGE.promptMaxChars) break;
  }
  return raw;
}
