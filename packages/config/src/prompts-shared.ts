import type { LlmProfileKey } from "./llm";

export const PROMPT_CATEGORIES = ["persona", "writing", "media", "memory", "authoring"] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export const PROMPT_CATEGORY_COPY: Record<PromptCategory, { label: string; blurb: string }> = {
  persona: {
    label: "Persona",
    blurb: "Who they are, how they speak, and what they will not say.",
  },
  writing: {
    label: "Writing",
    blurb: "Reply suggestions and the rewrite of a line you drafted.",
  },
  media: {
    label: "Photos",
    blurb: "How a look, a scene, a caption and a photo idea are written.",
  },
  memory: {
    label: "Memory",
    blurb: "Chapters, the mind update, and messages they send unprompted.",
  },
  authoring: {
    label: "Authoring",
    blurb: "The prompts behind the suggest and enhance buttons on a character card.",
  },
};

export interface PromptDefinition {
  key: string;
  description: string;
  variables: string[];
  value: string;
  category?: PromptCategory;
  byProfile?: Partial<Record<LlmProfileKey, string>>;
}
