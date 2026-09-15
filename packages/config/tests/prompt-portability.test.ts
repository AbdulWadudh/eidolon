import { describe, expect, it } from "bun:test";
import { DEFAULT_LLM_PROFILE, LLM_PROFILES, type LlmProfileKey } from "../src/llm";
import { defaultPrompt, PROMPT_DEFAULTS, render } from "../src/prompts";

const VENDOR_CHAT_TOKENS = [
  "<|im_start|>",
  "<|im_end|>",
  "[INST]",
  "[/INST]",
  "<<SYS>>",
  "<</SYS>>",
  "<start_of_turn>",
  "<end_of_turn>",
  "<|eot_id|>",
  "<|start_header_id|>",
  "<|endoftext|>",
];

const REASONING_SCAFFOLDING = [
  "step by step",
  "step-by-step",
  "think through",
  "think carefully",
  "chain of thought",
  "chain-of-thought",
  "scratchpad",
  "reason about",
  "reason through",
  "before you answer, think",
  "take a deep breath",
  "let's think",
  "let us think",
  "<think>",
  "</think>",
  "show your work",
  "show your reasoning",
  "explain your reasoning",
  "first, consider",
];

const CHAT_SYSTEM_TURN = [
  "persona.system",
  "persona.pronouns",
  "persona.scenario",
  "persona.rules",
  "persona.characterLikes",
  "persona.exampleDialogue",
  "persona.searchContext",
  "persona.user",
  "persona.userLikes",
  "mind.outputDirective",
  "persona.influence",
  "persona.webAnswerOnly",
];

function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] as string))];
}

function emptyVariables(entry: { variables: string[] }): Record<string, string> {
  return Object.fromEntries(entry.variables.map((name) => [name, ""]));
}

function variants(entry: (typeof PROMPT_DEFAULTS)[number]): [string, string][] {
  return [
    ["default", entry.value],
    ...Object.entries(entry.byProfile ?? {}).map(([key, text]) => [key, text] as [string, string]),
  ];
}

function scaffolding(keys: string[]): string {
  return keys
    .map((key) => {
      const entry = PROMPT_DEFAULTS.find((candidate) => candidate.key === key);
      if (!entry)
        throw new Error(`The chat system turn names a prompt that does not exist: ${key}`);
      return render(entry.value, emptyVariables(entry));
    })
    .join("\n\n");
}

describe("no prompt carries a vendor chat token", () => {
  for (const entry of PROMPT_DEFAULTS) {
    for (const [label, text] of variants(entry)) {
      it(`${entry.key} (${label})`, () => {
        for (const token of VENDOR_CHAT_TOKENS) {
          expect(text).not.toInclude(token);
        }
      });
    }
  }
});

describe("no prompt asks the model to reason in its text", () => {
  for (const entry of PROMPT_DEFAULTS) {
    for (const [label, text] of variants(entry)) {
      it(`${entry.key} (${label})`, () => {
        const lower = text.toLowerCase();
        for (const phrase of REASONING_SCAFFOLDING) {
          expect(lower).not.toInclude(phrase);
        }
      });
    }
  }
});

describe("placeholders and declared variables agree in both directions", () => {
  for (const entry of PROMPT_DEFAULTS) {
    it(`${entry.key} declares every placeholder it writes`, () => {
      for (const name of placeholders(entry.value)) {
        expect(entry.variables).toContain(name);
      }
    });

    it(`${entry.key} writes every variable it declares`, () => {
      const used = placeholders(entry.value);
      for (const name of entry.variables) {
        expect(used).toContain(name);
      }
    });

    it(`${entry.key} renders with nothing left unsubstituted`, () => {
      expect(render(entry.value, emptyVariables(entry))).not.toMatch(/\{\{\w+\}\}/);
    });

    for (const [profile, text] of Object.entries(entry.byProfile ?? {})) {
      it(`${entry.key} (${profile}) takes the same variables as the default`, () => {
        expect(placeholders(text).sort()).toEqual(placeholders(entry.value).sort());
      });
    }
  }
});

describe("the assembled chat system turn fits every profile", () => {
  const assembled = scaffolding(CHAT_SYSTEM_TURN);
  const target = LLM_PROFILES[DEFAULT_LLM_PROFILE];
  const targetRoom = target.promptMaxChars - target.historyMaxChars;

  it(`${DEFAULT_LLM_PROFILE} leaves the conversation its full budget (${assembled.length} of ${targetRoom} chars)`, () => {
    expect(assembled.length).toBeLessThanOrEqual(targetRoom);
  });

  for (const name of Object.keys(LLM_PROFILES) as LlmProfileKey[]) {
    const profile = LLM_PROFILES[name];

    it(`${name} stays inside its context window (${assembled.length} of ${profile.promptMaxChars} chars)`, () => {
      expect(assembled.length).toBeLessThanOrEqual(profile.promptMaxChars);
    });
  }
});

describe("the byProfile escape hatch is present and unused", () => {
  it("falls through to value when no variant is declared", () => {
    const entry = PROMPT_DEFAULTS.find((candidate) => candidate.key === "persona.system");
    expect(defaultPrompt("persona.system")).toBe(entry?.value ?? "");
  });

  it("names no prompt that has earned a fork", () => {
    const forked = PROMPT_DEFAULTS.filter(
      (entry) => Object.keys(entry.byProfile ?? {}).length > 0,
    ).map((entry) => entry.key);
    expect(forked).toEqual([]);
  });
});
