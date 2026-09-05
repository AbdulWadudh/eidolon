import { render, SUGGESTIONS } from "@eidolon/config";
import { isString, shuffle, take, uniq } from "es-toolkit";
import { getPrompt } from "@/prompts/store";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { safeJsonParse } from "@/utils/json";

const FALLBACK_POOL = [
  "*leans in, lowering my voice* Say that again, slowly.",
  "*folds my arms* You are enjoying this far too much.",
  "*laughs under my breath* Go on then, surprise me.",
  "*tilts my head* And what exactly am I supposed to do with that?",
  "*steps closer* Tell me what you are not saying.",
  "*glances away* Maybe we should change the subject.",
  "*raises an eyebrow* That is a bold thing to admit.",
  "*settles back* I am listening. Take your time.",
  "*reaches for your hand* Stay with me a moment longer.",
];

const NEWLINE = String.fromCharCode(10);
const PLAYER_LABEL = "PLAYER";

function stopSequences(characterLabel: string): string[] {
  return [`${characterLabel}:`, `${NEWLINE}${PLAYER_LABEL}:`, NEWLINE + NEWLINE];
}
const SPEAKER_PREFIX = /^(?:PLAYER|YOU)\s*:\s*/i;

function systemPrompt(intent: string): string {
  return render(getPrompt("suggestions.system"), {
    intent,
    maxSentences: SUGGESTIONS.maxSentences,
  });
}

export function formatScene(transcript: ChatMessage[], characterName: string): string {
  const characterLabel = characterName.toUpperCase();
  return transcript
    .slice(-SUGGESTIONS.sceneTurns)
    .map((entry) => `${entry.role === "user" ? PLAYER_LABEL : characterLabel}: ${entry.content}`)
    .join(NEWLINE);
}

const LIST_MARKER = /^\s*(?:[-•]\s+|\d+[.)]\s*)/;
const LINE_BREAK = /\r?\n/;

export function suggestionIntents(): string[] {
  return getPrompt("suggestions.intents")
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
const MIN_LINE_CANDIDATES = 2;

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).filter((part) => part.trim().length > 0);
}

export function shapeSuggestion(raw: string): string {
  const collapsed = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'`]|["'`]$/g, "");
  if (collapsed.length === 0) return "";

  const kept = splitSentences(collapsed).slice(0, SUGGESTIONS.maxSentences).join(" ").trim();
  const shaped = kept.length > 0 ? kept : collapsed;
  if (shaped.length <= SUGGESTIONS.maxChars) return shaped;

  const clipped = shaped.slice(0, SUGGESTIONS.maxChars);
  const lastBreak = clipped.lastIndexOf(" ");
  return `${(lastBreak > SUGGESTIONS.maxChars / 2 ? clipped.slice(0, lastBreak) : clipped).trimEnd()}…`;
}

export function hasStageDirection(text: string): boolean {
  return /\*[^*]+\*/.test(text);
}

export function fallbackSuggestions(): string[] {
  return take(shuffle(FALLBACK_POOL), SUGGESTIONS.count);
}

function cleanLine(line: string): string {
  return line
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .replace(LIST_MARKER, "")
    .replace(/^["'`]|["'`]$/g, "")
    .trim();
}

function onlyStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isString) : [];
}

export function extractCandidates(raw: string): string[] {
  const opened = raw.indexOf("[");
  const closed = raw.lastIndexOf("]");
  const bracketed = opened >= 0 && closed > opened;
  const block = bracketed ? raw.slice(opened, closed + 1) : "";

  if (bracketed) {
    try {
      const strict = onlyStrings(JSON.parse(block));
      if (strict.length > 0) return strict;
    } catch {
      // Unquoted or trailing-comma output is normal from small local models.
    }
  }

  const body = bracketed ? raw.slice(opened + 1, closed) : raw;
  const lines = body
    .split(LINE_BREAK)
    .map(cleanLine)
    .filter((line) => line.length > 0);
  if (lines.length >= MIN_LINE_CANDIDATES) return lines;

  const repaired = onlyStrings(safeJsonParse<unknown>(block, []));
  return repaired.length >= MIN_LINE_CANDIDATES ? repaired : [];
}

export function normalizeSuggestions(candidates: unknown): string[] {
  const shaped = onlyStrings(candidates)
    .map(shapeSuggestion)
    .filter((entry) => entry.length > 0);

  const unique = take(uniq(shaped), SUGGESTIONS.count);
  if (unique.length === SUGGESTIONS.count) return unique;

  for (const filler of fallbackSuggestions()) {
    if (unique.length === SUGGESTIONS.count) break;
    if (!unique.includes(filler)) unique.push(filler);
  }
  return unique;
}

export function firstLine(raw: string): string {
  const line = raw.split(LINE_BREAK).find((entry) => entry.trim().length > 0) ?? "";
  return cleanLine(line.replace(SPEAKER_PREFIX, ""));
}

async function generateOne(
  scene: string,
  intent: string,
  characterLabel: string,
  context: SuggestionContext,
  signal?: AbortSignal,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(intent) },
    {
      role: "user",
      content: render(getPrompt("suggestions.user"), {
        scene,
        intent,
        player: PLAYER_LABEL,
        character: context.characterName,
        tier: context.tier,
      }),
    },
  ];

  let raw = "";
  try {
    for await (const token of streamChatCompletion(messages, signal, {
      temperature: SUGGESTIONS.temperature,
      maxTokens: SUGGESTIONS.maxTokens,
      stop: stopSequences(characterLabel),
      allowMockFallback: false,
    })) {
      if (signal?.aborted) break;
      raw += token;
      if (raw.length > SUGGESTIONS.maxChars * 4) break;
    }
  } catch {
    return "";
  }

  return firstLine(raw);
}

export interface SuggestionContext {
  characterName: string;
  tier: string;
}

export async function generateReplySuggestions(
  transcript: ChatMessage[],
  context: SuggestionContext,
  signal?: AbortSignal,
): Promise<string[]> {
  if (signal?.aborted) return fallbackSuggestions();

  const characterLabel = context.characterName.toUpperCase();
  const scene = formatScene(transcript, context.characterName);
  const drafts = await Promise.all(
    suggestionIntents().map((intent) =>
      generateOne(scene, intent, characterLabel, context, signal),
    ),
  );

  return normalizeSuggestions(drafts);
}
