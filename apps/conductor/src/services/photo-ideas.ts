import { IMAGE, render } from "@eidolon/config";
import { take, uniq } from "es-toolkit";
import { getPrompt } from "@/prompts/store";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { safeJsonParse } from "@/utils/json";

const FALLBACK_IDEAS = [
  "where I am right now",
  "the view from here",
  "what I'm having",
  "me and the dog",
  "the street outside",
  "what I'm wearing today",
];

function extractIdeas(raw: string): string[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start >= 0 && end > start) {
    const parsed = safeJsonParse<unknown>(raw.slice(start, end + 1), null);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string");
    }
  }

  return raw
    .split(/[\r\n]+/)
    .map((line) =>
      line
        .replace(/^\s*[-*\d.)"]+\s*/, "")
        .replace(/[",]+$/, "")
        .trim(),
    )
    .filter((line) => line.length > 0);
}

function tidy(idea: string): string {
  return idea
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .slice(0, IMAGE.ideaMaxChars);
}

export async function generatePhotoIdeas(
  name: string,
  scene: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: render(getPrompt("image.ideas"), {
        name,
        scene,
        count: IMAGE.ideaCount,
        maxChars: IMAGE.ideaMaxChars,
      }),
    },
  ];

  let raw = "";
  try {
    for await (const token of streamChatCompletion(messages, signal, {
      temperature: IMAGE.ideaTemperature,
      maxTokens: IMAGE.promptMaxTokens,
      allowMockFallback: false,
    })) {
      raw += token;
      if (raw.length > IMAGE.promptMaxChars) break;
    }
  } catch {
    return take(FALLBACK_IDEAS, IMAGE.ideaCount);
  }

  const ideas = uniq(
    extractIdeas(raw)
      .map(tidy)
      .filter((idea) => idea.length > 0),
  );
  const filled = [...ideas, ...FALLBACK_IDEAS.filter((idea) => !ideas.includes(idea))];
  return take(filled, IMAGE.ideaCount);
}
