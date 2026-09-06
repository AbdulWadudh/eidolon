import { AUTHORING_PROMPTS } from "./prompts/authoring";
import { MEDIA_PROMPTS } from "./prompts/media";
import { MEMORY_PROMPTS } from "./prompts/memory";
import { PERSONA_PROMPTS } from "./prompts/persona";
import { WRITING_PROMPTS } from "./prompts/writing";
import type { PromptDefinition } from "./prompts-shared";

export type { PromptDefinition } from "./prompts-shared";

export const PROMPT_DEFAULTS: PromptDefinition[] = [
  ...PERSONA_PROMPTS,
  ...WRITING_PROMPTS,
  ...MEDIA_PROMPTS,
  ...MEMORY_PROMPTS,
  ...AUTHORING_PROMPTS,
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
