import { IMAGE, render } from "@eidolon/config";
import { shuffle, take } from "es-toolkit";
import { getPrompt } from "@/prompts/store";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { safeJsonParse } from "@/utils/json";

const FALLBACK_IDEAS = [
  "where I am right now",
  "the view from here",
  "what I'm having",
  "the street outside",
  "what I'm wearing today",
  "the mess I'm sitting in",
  "what I'm drinking",
  "the light in here",
  "what's on the table",
  "the walk home",
  "where I ended up",
  "the sky right now",
];

// A model handed an example copies it. These are the phrases earlier versions of
// the prompt offered, and they came back verbatim whatever the conversation was.
const PARROTS = ["me and the dog on the sofa", "the view from the top", "hey just got home"];

const BANNED =
  /\b(phone|screen|text|texting|texts|sending|send button|camera roll|selfie stick)\b/i;
const LEAD_IN = /^(?:a |an |the )?(?:photo|picture|pic|shot|image) of /i;
const ARRAY_GROUP = /\[[^[\]]*\]/g;
const WORD = /[^a-z0-9]+/;

function onlyStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * Reads every bracketed group rather than the span from the first bracket to the
 * last. A local model asked for one array sometimes answers with three, and the
 * span between them is prose that repairs into nothing.
 */
export function extractIdeas(raw: string): string[] {
  const groups = raw.match(ARRAY_GROUP) ?? [];
  const parsed = groups.flatMap((group) => onlyStrings(safeJsonParse<unknown>(group, null)));
  if (parsed.length > 0) return parsed;

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

function clip(idea: string): string {
  if (idea.length <= IMAGE.ideaMaxChars) return idea;
  const cut = idea.slice(0, IMAGE.ideaMaxChars);
  const lastBreak = cut.lastIndexOf(" ");
  return (lastBreak > IMAGE.ideaMaxChars / 2 ? cut.slice(0, lastBreak) : cut).trimEnd();
}

export function tidy(idea: string): string {
  return clip(
    idea
      .replace(/\s+/g, " ")
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(LEAD_IN, "")
      .replace(/[.!?]+$/, "")
      .trim(),
  );
}

function words(idea: string): string[] {
  return idea
    .toLowerCase()
    .split(WORD)
    .filter((word) => word.length > 0);
}

const FILLER_WORDS = new Set([
  "a",
  "an",
  "the",
  "my",
  "me",
  "i",
  "of",
  "and",
  "in",
  "on",
  "at",
  "with",
  "from",
  "is",
  "it",
  "this",
  "that",
  "right",
  "now",
  "today",
]);

function subject(idea: string): Set<string> {
  return new Set(words(idea).filter((word) => !FILLER_WORDS.has(word)));
}

/**
 * Two ideas built from the same handful of words are one idea. A model asked for
 * four distinct photos happily returns "third coffee, quiet office" four times
 * in a different order, and four chips saying the same thing read as a bug.
 */
export function echoes(left: string, right: string): boolean {
  const one = subject(left);
  const two = subject(right);
  if (one.size === 0 || two.size === 0) return one.size === two.size;

  const shared = [...two].filter((word) => one.has(word)).length;
  return shared / Math.min(one.size, two.size) >= IMAGE.ideaOverlap;
}

function distinct(ideas: string[]): string[] {
  const chosen: string[] = [];
  for (const idea of ideas) {
    if (!chosen.some((kept) => echoes(kept, idea))) chosen.push(idea);
  }
  return chosen;
}

export function isUsable(idea: string, name: string): boolean {
  const said = words(idea);
  if (said.length === 0 || said.length > IMAGE.ideaMaxWords) return false;
  if (BANNED.test(idea)) return false;
  if (said.includes(name.toLowerCase())) return false;
  return !PARROTS.includes(said.join(" "));
}

export function fill(ideas: string[]): string[] {
  const chosen = distinct(ideas);

  for (const filler of shuffle(FALLBACK_IDEAS)) {
    if (chosen.length >= IMAGE.ideaCount) break;
    if (chosen.some((kept) => echoes(kept, filler))) continue;
    chosen.push(filler);
  }

  return take(chosen, IMAGE.ideaCount);
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
    return take(shuffle(FALLBACK_IDEAS), IMAGE.ideaCount);
  }

  return fill(
    extractIdeas(raw)
      .map(tidy)
      .filter((idea) => isUsable(idea, name)),
  );
}
