import {
  AUTHORING_PROMPTS,
  JOB_AUTHORING_PROMPTS,
  PROMPT_AUTHORING_PROMPTS,
} from "./prompts/authoring";
import { MEDIA_PROMPTS } from "./prompts/media";
import { MEMORY_PROMPTS } from "./prompts/memory";
import { PERSONA_PROMPTS } from "./prompts/persona";
import { WRITING_PROMPTS } from "./prompts/writing";
import type { PromptCategory, PromptDefinition } from "./prompts-shared";

export {
  PROMPT_CATEGORIES,
  PROMPT_CATEGORY_COPY,
  type PromptCategory,
  type PromptDefinition,
} from "./prompts-shared";

function inCategory(entries: PromptDefinition[], category: PromptCategory): PromptDefinition[] {
  return entries.map((entry) => ({ ...entry, category }));
}

export const PROMPT_DEFAULTS: PromptDefinition[] = [
  ...inCategory(PERSONA_PROMPTS, "persona"),
  ...inCategory(WRITING_PROMPTS, "writing"),
  ...inCategory(MEDIA_PROMPTS, "media"),
  ...inCategory(MEMORY_PROMPTS, "memory"),
  ...inCategory(
    [...AUTHORING_PROMPTS, ...PROMPT_AUTHORING_PROMPTS, ...JOB_AUTHORING_PROMPTS],
    "authoring",
  ),
];

export const PROMPT_KEYS = PROMPT_DEFAULTS.map((entry) => entry.key);

export function defaultPrompt(key: string): string {
  return PROMPT_DEFAULTS.find((entry) => entry.key === key)?.value ?? "";
}

export function render(template: string, variables: Record<string, string | number>): string {
  return template
    .replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
      name in variables ? String(variables[name]) : match,
    )
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
