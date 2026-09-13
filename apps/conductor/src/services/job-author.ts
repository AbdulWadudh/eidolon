import type { AuthorMode } from "@eidolon/config";
import { render } from "@eidolon/config";
import { IMAGE, PROMPT_AUTHORING } from "@/config";
import { getPrompt } from "@/prompts/store";
import { AuthorUnavailableError } from "@/services/character-author";
import { ask, isPromptLike } from "@/services/prompt-writer";

const FENCE = /^```[a-z]*\s*|\s*```$/gi;
const LABEL = /^\s*(?:prompt|rewritten|output|result|current)\s*:\s*/i;

export const AUTHORABLE_FIELD = /prompt|request/i;

export function isAuthorableField(field: string): boolean {
  return AUTHORABLE_FIELD.test(field);
}

export function shapeJobPrompt(raw: string): string {
  const line = raw
    .replace(FENCE, "")
    .split(/\r?\n/)
    .map((part) => part.replace(LABEL, "").trim())
    .find((part) => part.length > 0);

  const cleaned = (line ?? "").replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return cleaned.length > IMAGE.promptMaxChars ? cleaned.slice(0, IMAGE.promptMaxChars) : cleaned;
}

export async function authorJobPrompt(
  draft: string,
  mode: AuthorMode,
  signal?: AbortSignal,
): Promise<string> {
  const trimmed = draft.trim();
  if (trimmed.length === 0) {
    throw new AuthorUnavailableError("There is nothing written there to rework yet.");
  }

  const template = getPrompt(
    mode === "suggest" ? "authoring.jobPromptWrite" : "authoring.jobPromptEnhance",
  );
  const prompt = render(template, { draft: trimmed });

  const temperatures =
    mode === "suggest"
      ? PROMPT_AUTHORING.suggestTemperatures
      : PROMPT_AUTHORING.enhanceTemperatures;

  for (const temperature of temperatures) {
    let written = "";
    try {
      written = shapeJobPrompt(await ask(prompt, temperature, signal));
    } catch (error) {
      throw new AuthorUnavailableError(
        error instanceof Error ? error.message : "The model could not be reached.",
      );
    }

    if (written.length > 0 && written !== trimmed && isPromptLike(written)) return written;
  }

  throw new AuthorUnavailableError("The model kept answering in prose rather than a prompt.");
}
