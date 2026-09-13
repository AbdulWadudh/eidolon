import { AUTHOR_FIELD_KEYS, AUTHOR_FIELDS, AUTHORING, PROMPT_AUTHORING } from "../authoring";
import {
  CHRONICLE_CONTEXT,
  LOREBOOK,
  MIND_UPDATE,
  PROMPT_BUDGET,
  RECALL,
  WEB_CONTEXT,
  WORKING_CONTEXT,
} from "../memory";
import { CHARACTER_PRESETS, PRESET_COPY } from "../presets";
import { PROMPT_CATEGORIES, PROMPT_CATEGORY_COPY, PROMPT_DEFAULTS, PROMPT_KEYS } from "../prompts";
import { CHRONICLE, PROACTIVE } from "../queue";
import { REASONS } from "./reasons";
import type { ConfigGroup } from "./types";

export const PROMPTING_GROUPS: ConfigGroup[] = [
  {
    name: "WORKING_CONTEXT",
    source: "memory.ts",
    value: WORKING_CONTEXT,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "RECALL",
    source: "memory.ts",
    value: RECALL,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "CHRONICLE_CONTEXT",
    source: "memory.ts",
    value: CHRONICLE_CONTEXT,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "LOREBOOK",
    source: "memory.ts",
    value: LOREBOOK,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "WEB_CONTEXT",
    source: "memory.ts",
    value: WEB_CONTEXT,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "MIND_UPDATE",
    source: "memory.ts",
    value: MIND_UPDATE,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      marker: {
        bucket: "structural",
        reason:
          "Written into the prompt and matched back out of the model's output. Both ends must agree.",
      },
    },
  },
  {
    name: "PROMPT_BUDGET",
    source: "memory.ts",
    value: PROMPT_BUDGET,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      sectionOrder: { bucket: "structural", reason: REASONS.typeLevel },
    },
  },
  {
    name: "CHRONICLE",
    source: "queue.ts",
    value: CHRONICLE,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "PROACTIVE",
    source: "queue.ts",
    value: PROACTIVE,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "AUTHORING",
    source: "authoring.ts",
    value: AUTHORING,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      fields: {
        bucket: "editable",
        reason: "The same specs as AUTHOR_FIELDS, reached through AUTHORING.fields.",
      },
    },
  },
  {
    name: "AUTHOR_FIELDS",
    source: "authoring.ts",
    value: AUTHOR_FIELDS,
    bucket: "editable",
    reason: "Each field's guidance and limits go into the prompt on every authoring request.",
  },
  {
    name: "PROMPT_AUTHORING",
    source: "authoring.ts",
    value: PROMPT_AUTHORING,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "AUTHOR_FIELD_KEYS",
    source: "authoring.ts",
    value: AUTHOR_FIELD_KEYS,
    bucket: "structural",
    reason: REASONS.typeLevel,
  },
  {
    name: "PROMPT_DEFAULTS",
    source: "prompts.ts",
    value: PROMPT_DEFAULTS,
    bucket: "structural",
    reason: REASONS.promptStore,
  },
  {
    name: "PROMPT_KEYS",
    source: "prompts.ts",
    value: PROMPT_KEYS,
    bucket: "structural",
    reason: REASONS.promptStore,
  },
  {
    name: "PROMPT_CATEGORIES",
    source: "prompts-shared.ts",
    value: PROMPT_CATEGORIES,
    bucket: "structural",
    reason: REASONS.typeLevel,
  },
  {
    name: "PROMPT_CATEGORY_COPY",
    source: "prompts-shared.ts",
    value: PROMPT_CATEGORY_COPY,
    bucket: "structural",
    reason: REASONS.copy,
  },
  {
    name: "CHARACTER_PRESETS",
    source: "presets.ts",
    value: CHARACTER_PRESETS,
    bucket: "structural",
    reason: REASONS.seedData,
  },
  {
    name: "PRESET_COPY",
    source: "presets.ts",
    value: PRESET_COPY,
    bucket: "structural",
    reason: REASONS.copy,
  },
];
