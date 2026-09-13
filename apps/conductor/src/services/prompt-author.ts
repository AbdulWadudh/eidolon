import type { AuthorMode } from "@eidolon/config";
import { PROMPT_DEFAULTS } from "@eidolon/config";
import { PROMPT_AUTHORING } from "@/config";
import { getPrompt } from "@/prompts/store";
import { AuthorUnavailableError } from "@/services/character-author";
import { CompletionUnsupportedError, completeText } from "@/services/llm";

const NEWLINE = String.fromCharCode(10);
const FENCE = /^```[a-z]*\s*|\s*```$/gi;
const WRAPPING_QUOTES = /^["'“”‘’]+|["'“”‘’]+$/g;
const LEAD_LABEL = /^\s*(?:prompt|write the prompt|rewritten|output|result)\s*:\s*/i;

export interface PromptAuthorRequest {
  key: string;
  mode: AuthorMode;
  draft: string;
  signal?: AbortSignal;
}

function definitionFor(key: string) {
  return PROMPT_DEFAULTS.find((entry) => entry.key === key) ?? null;
}

export function shapePromptText(raw: string): string {
  const cleaned = raw
    .replace(FENCE, "")
    .split(/\r?\n/)
    .map((line) => line.replace(LEAD_LABEL, ""))
    .join(NEWLINE)
    .trim();

  const unquoted = cleaned.replace(WRAPPING_QUOTES, "").trim();
  return unquoted.length > PROMPT_AUTHORING.maxChars
    ? unquoted.slice(0, PROMPT_AUTHORING.maxChars).trimEnd()
    : unquoted;
}

export function missingVariables(written: string, variables: string[]): string[] {
  return variables.filter((name) => !written.includes(`{{${name}}}`));
}

function buildPrompt(
  mode: AuthorMode,
  description: string,
  variables: string[],
  draft: string,
): string {
  const template = getPrompt(
    mode === "suggest" ? "authoring.promptWrite" : "authoring.promptEnhance",
  );

  const parts = [template, "", `${PROMPT_AUTHORING.descriptionLabel} ${description}`];

  parts.push(
    variables.length > 0
      ? `${PROMPT_AUTHORING.variablesLabel} ${variables.map((name) => `{{${name}}}`).join(", ")}`
      : PROMPT_AUTHORING.noVariables,
  );

  if (mode === "enhance") parts.push("", PROMPT_AUTHORING.draftLabel, draft);
  parts.push("", PROMPT_AUTHORING.writeLabel);

  return parts.join(NEWLINE);
}

export async function authorPromptText(request: PromptAuthorRequest): Promise<string> {
  const definition = definitionFor(request.key);
  if (!definition) throw new AuthorUnavailableError("No such prompt.");

  const draft = request.draft.trim().slice(0, PROMPT_AUTHORING.maxDraftChars);
  if (request.mode === "enhance" && draft.length === 0) {
    throw new AuthorUnavailableError("There is nothing written there to rework yet.");
  }

  const variables = definition.variables;
  const prompt = buildPrompt(request.mode, definition.description, variables, draft);

  async function attempt(temperature: number): Promise<string> {
    try {
      return await completeText({
        prompt,
        temperature,
        maxTokens: PROMPT_AUTHORING.maxTokens,
        stop: [PROMPT_AUTHORING.draftLabel, PROMPT_AUTHORING.writeLabel],
        signal: request.signal,
      });
    } catch (error) {
      if (error instanceof CompletionUnsupportedError) {
        throw new AuthorUnavailableError(
          "This model server cannot write text. It needs a /completions endpoint.",
        );
      }
      throw new AuthorUnavailableError(
        error instanceof Error ? error.message : "The model could not be reached.",
      );
    }
  }

  const temperatures =
    request.mode === "suggest"
      ? PROMPT_AUTHORING.suggestTemperatures
      : PROMPT_AUTHORING.enhanceTemperatures;

  let lastMissing: string[] = [];

  for (const temperature of temperatures) {
    const written = shapePromptText(await attempt(temperature));
    if (written.length === 0) continue;
    if (request.mode === "enhance" && written === draft) continue;

    lastMissing = missingVariables(written, variables);
    if (lastMissing.length === 0) return written;
  }

  if (lastMissing.length > 0) {
    throw new AuthorUnavailableError(
      `It kept dropping ${lastMissing.map((name) => `{{${name}}}`).join(", ")}, so nothing was changed.`,
    );
  }

  throw new AuthorUnavailableError("The model had nothing to offer for that one.");
}
