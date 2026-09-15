export const LLM_PROFILES = {
  qwen35: {
    label: "Qwen3.5 (ChatML, hybrid SSM, thinking on request)",
    modelFile: "Qwen3.5-9B-The-Defiant-Fable-Uncnr-Heretic-NEO-MAX-Q6_K.gguf",
    contextTokens: 32768,
    promptMaxChars: 40000,
    historyMaxChars: 24000,
    historyTurns: 40,
    stopTokens: ["<|im_end|>", "<|endoftext|>", "<|im_start|>"],
    systemTurn: "leadingOnly",
    thinking: "capable",
    thinkingTokens: 700,
    sampling: {
      temperature: 0.7,
      topP: 0.85,
      minP: 0.05,
      repeatPenalty: 1.05,
      presencePenalty: 0.6,
      frequencyPenalty: 0.4,
    },
  },
  llama3: {
    label: "Llama 3 roleplay finetunes (Stheno and kin)",
    modelFile: "L3-8B-Stheno-v3.3-32K-NEO-V1-D_AU-Q5_K_M.gguf",
    contextTokens: 16384,
    promptMaxChars: 10000,
    historyMaxChars: 6000,
    historyTurns: 20,
    stopTokens: ["<|eot_id|>", "<|end_of_text|>", "<|start_header_id|>"],
    systemTurn: "anywhere",
    thinking: "none",
    thinkingTokens: 0,
    sampling: {
      temperature: 0.85,
      topP: 0.9,
      minP: 0.05,
      repeatPenalty: 1.05,
      presencePenalty: 0.6,
      frequencyPenalty: 0.4,
    },
  },
} as const;

export type LlmProfileKey = keyof typeof LLM_PROFILES;
export type LlmProfile = (typeof LLM_PROFILES)[LlmProfileKey];

export const DEFAULT_LLM_PROFILE: LlmProfileKey = "qwen35";

export function isLlmProfileKey(value: string): value is LlmProfileKey {
  return Object.hasOwn(LLM_PROFILES, value);
}
