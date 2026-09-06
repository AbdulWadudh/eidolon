import { ENHANCE } from "@eidolon/config";
import { splitInfluence } from "@eidolon/protocol";
import { random } from "es-toolkit";
import { getPrompt } from "@/prompts/store";
import { CompletionUnsupportedError, completeText } from "@/services/llm";
import { isActionOnly } from "@/services/reply-length";

const NEWLINE = String.fromCharCode(10);
const SPEAKER_PREFIX = /^\s*(?:player|you|me|user|draft|sentence|rewrite|improved)\s*:\s*/i;
const WRAPPING_QUOTES = /^["'“”‘’`]+|["'“”‘’`]+$/g;
const FENCE = /^```[a-z]*\s*|\s*```$/gi;
const ACTION = /\*[^*]+\*/g;

export class EnhanceUnavailableError extends Error {}

export function hasAction(text: string): boolean {
  ACTION.lastIndex = 0;
  return ACTION.test(text);
}

export function isQuestion(text: string): boolean {
  return text.includes("?");
}

export function keepOneAction(text: string): string {
  let seen = 0;
  return text
    .replace(ACTION, (match) => {
      seen += 1;
      return seen === 1 ? match : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A stage direction is only ever offered on a draft that has none already, and
 * never on a question: asked to open a question with an action, the model
 * answers the question instead of rewriting it.
 */
export function canAddAction(draft: string): boolean {
  return !hasAction(draft) && !isQuestion(draft);
}

export function shouldAddAction(draft: string, roll: number = random(0, 1)): boolean {
  return canAddAction(draft) && roll < ENHANCE.actionChance;
}

export function shapeEnhanced(raw: string): string {
  const collapsed = raw
    .replace(FENCE, "")
    .split(/\r?\n/)
    .map((line) => line.replace(SPEAKER_PREFIX, "").trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(WRAPPING_QUOTES, "")
    .trim();

  const capped = keepOneAction(collapsed);

  return capped.length > ENHANCE.maxOutputChars
    ? capped.slice(0, ENHANCE.maxOutputChars).trimEnd()
    : capped;
}

export function isUsableRewrite(draft: string, rewrite: string): boolean {
  if (rewrite.length === 0) return false;
  if (isActionOnly(rewrite)) return false;
  return rewrite.trim().toLowerCase() !== draft.trim().toLowerCase();
}

export function buildEnhancePrompt(draft: string, withAction = false): string {
  return [
    getPrompt(withAction ? "enhance.instructionWithAction" : "enhance.instruction"),
    "",
    `${ENHANCE.draftLabel} ${draft}`,
    ENHANCE.rewriteLabel,
  ].join(NEWLINE);
}

export function restoreInfluences(rewrite: string, influences: string[]): string {
  if (influences.length === 0) return rewrite;
  return `${influences.map((entry) => `<${entry}>`).join(" ")} ${rewrite}`.trim();
}

export interface EnhanceOptions {
  withAction?: boolean;
  signal?: AbortSignal;
}

export async function enhanceMessage(draft: string, options: EnhanceOptions = {}): Promise<string> {
  const normalized = draft.trim().replace(/\s+/g, " ").slice(0, ENHANCE.maxInputChars);
  if (normalized.length === 0) {
    throw new EnhanceUnavailableError("There is nothing written to rework yet.");
  }

  // A nudge is the reader's instruction to the character, not part of the line
  // being reworked. It is lifted out before the model sees it and put back
  // afterwards, because a prompt asking the model to preserve it does not.
  const { spoken, influences } = splitInfluence(normalized);
  if (spoken.length === 0) {
    throw new EnhanceUnavailableError("There is nothing written to rework yet.");
  }

  const withAction = options.withAction ?? shouldAddAction(spoken);
  const prompt = buildEnhancePrompt(spoken, withAction);

  async function attempt(temperature: number): Promise<string> {
    try {
      return await completeText({
        prompt,
        temperature,
        maxTokens: ENHANCE.maxTokens,
        stop: [NEWLINE, ENHANCE.draftLabel],
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof CompletionUnsupportedError) {
        throw new EnhanceUnavailableError(
          "This model server does not support rewriting. It needs a /completions endpoint.",
        );
      }
      throw new EnhanceUnavailableError(
        error instanceof Error ? error.message : "The model could not be reached.",
      );
    }
  }

  for (const temperature of [ENHANCE.temperature, ENHANCE.retryTemperature]) {
    const rewrite = shapeEnhanced(await attempt(temperature));
    if (isUsableRewrite(spoken, rewrite)) return restoreInfluences(rewrite, influences);
  }

  throw new EnhanceUnavailableError("The model had nothing left to change.");
}
