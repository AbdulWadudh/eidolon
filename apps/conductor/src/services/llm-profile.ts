import { LLM_PROFILES, type LlmProfile } from "@eidolon/config";
import { getLlmProfile } from "@eidolon/config/server";
import type { ChatMessage } from "@/services/llm";

const SECTION_BREAK = String.fromCharCode(10, 10);

export const PROFILE: LlmProfile = LLM_PROFILES[getLlmProfile()];

export const STOP_TOKENS: readonly string[] = PROFILE.stopTokens;

function foldIntoLeadingSystem(messages: ChatMessage[], note: string): ChatMessage[] {
  const [first, ...rest] = messages;
  if (first?.role !== "system") {
    return [{ role: "system", content: note }, ...messages];
  }
  return [{ role: "system", content: `${first.content}${SECTION_BREAK}${note}` }, ...rest];
}

function appendSystemTurn(messages: ChatMessage[], note: string): ChatMessage[] {
  return [...messages, { role: "system", content: note }];
}

export function canThink(): boolean {
  return PROFILE.thinking === "capable";
}

export function thinkingBudget(answerTokens: number): number {
  return canThink() ? answerTokens + PROFILE.thinkingTokens : answerTokens;
}

export function placeSystemNote(messages: ChatMessage[], note: string): ChatMessage[] {
  const trimmed = note.trim();
  if (trimmed.length === 0) return messages;

  return PROFILE.systemTurn === "leadingOnly"
    ? foldIntoLeadingSystem(messages, trimmed)
    : appendSystemTurn(messages, trimmed);
}
