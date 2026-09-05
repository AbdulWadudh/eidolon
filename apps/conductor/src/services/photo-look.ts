import { IMAGE, render } from "@eidolon/config";
import { getCharacterAppearance, setCharacterAppearance } from "@/db";
import { getPrompt } from "@/prompts/store";
import { ask, isPromptLike } from "@/services/prompt-writer";
import { safeJsonParse } from "@/utils/json";

export interface Look {
  age: string;
  face: string;
  eyes: string;
  hair: string;
  skin: string;
  build: string;
}

const LOOK_SCHEMA = {
  name: "appearance",
  schema: {
    type: "object",
    properties: {
      age: { type: "string" },
      face: { type: "string" },
      eyes: { type: "string" },
      hair: { type: "string" },
      skin: { type: "string" },
      build: { type: "string" },
    },
    required: ["age", "face", "eyes", "hair", "skin", "build"],
  },
} as const;

const appearances = new Map<string, Look>();

const FALLBACK_LOOK: Look = {
  age: "late twenties",
  face: "oval face",
  eyes: "warm brown eyes",
  hair: "shoulder length dark hair",
  skin: "fair skin",
  build: "slender build",
};

const EMPTY_WORDS = new Set<string>(IMAGE.emptyWords);

export function oneLine(text: string): string {
  const cleaned = text
    .replace(/[\r\n]+/g, ", ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/_/g, " ")
    .replace(/\byour\b/gi, "her")
    .replace(/\byou\b/gi, "her")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[.,;]+$/, "");
  return EMPTY_WORDS.has(cleaned.toLowerCase()) ? "" : cleaned;
}

export function fewWords(text: string): string {
  const firstPhrase = oneLine(text).split(",")[0] ?? "";
  return firstPhrase.split(/\s+/).slice(0, IMAGE.lookFieldMaxWords).join(" ");
}

const HAIR_CHANGE = new RegExp(`\\b(${IMAGE.hairChangeWords.join("|")})\\b`, "i");
const HAIR_COLOUR = new RegExp(`\\b(${IMAGE.hairColourWords.join("|")})\\b`, "i");
const BODY_CHANGE = new RegExp(`\\b(${IMAGE.bodyChangeWords.join("|")})\\b`, "i");

export function replacesHair(lookChange: string): boolean {
  if (HAIR_CHANGE.test(lookChange)) return true;
  return /\bhair\b/i.test(lookChange) && HAIR_COLOUR.test(lookChange);
}

export function usableLookChange(lookChange: string): string {
  if (lookChange.length === 0) return "";
  if (replacesHair(lookChange) || BODY_CHANGE.test(lookChange)) return lookChange;
  return "";
}

export function composeAppearance(look: Look, rawLookChange: string): string {
  const lookChange = usableLookChange(rawLookChange);
  const changesHair = replacesHair(lookChange);
  return [
    look.age,
    look.face,
    look.eyes,
    changesHair ? lookChange : look.hair,
    look.skin,
    look.build,
    changesHair ? "" : lookChange,
  ]
    .map(oneLine)
    .filter((part) => part.length > 0)
    .join(", ");
}

export interface LookRequest {
  characterId: string;
  name: string;
  personality: string;
}

export function forgetLook(characterId: string): void {
  appearances.delete(characterId);
}

export async function describeAppearance(
  request: LookRequest,
  signal?: AbortSignal,
): Promise<Look> {
  const cached = appearances.get(request.characterId);
  if (cached) return cached;

  const stored = safeJsonParse<Look | null>(
    getCharacterAppearance(request.characterId) ?? "",
    null,
  );
  if (stored?.hair) {
    appearances.set(request.characterId, stored);
    return stored;
  }

  const raw = await ask(
    render(getPrompt("image.appearance"), {
      name: request.name,
      personality: request.personality,
    }),
    IMAGE.appearanceTemperature,
    signal,
    LOOK_SCHEMA,
  );

  const parsed = safeJsonParse<Partial<Look> | null>(raw, null);
  const look: Look = {
    age: fewWords(parsed?.age ?? ""),
    face: fewWords(parsed?.face ?? ""),
    eyes: fewWords(parsed?.eyes ?? ""),
    hair: fewWords(parsed?.hair ?? ""),
    skin: fewWords(parsed?.skin ?? ""),
    build: fewWords(parsed?.build ?? ""),
  };

  const usable = isPromptLike(composeAppearance(look, "")) ? look : FALLBACK_LOOK;
  appearances.set(request.characterId, usable);
  setCharacterAppearance(request.characterId, JSON.stringify(usable));
  return usable;
}
