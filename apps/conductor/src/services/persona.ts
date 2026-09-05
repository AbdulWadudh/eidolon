import { CHAT_TURN, render } from "@eidolon/config";
import { getPrompt } from "@/prompts/store";
import type { ChatMessage } from "@/services/llm";

const NEWLINE = String.fromCharCode(10);

export interface CharacterCard {
  name: string;
  personality: string;
  systemPrompt: string;
  mood: string;
  tier: string;
}

export function hardenedReminder(): ChatMessage {
  return { role: "system", content: getPrompt("persona.hardenedReminder") };
}

export function buildSystemPrompt(card: CharacterCard, injectedContext?: string): string {
  const context = injectedContext?.trim() ?? "";
  const extra = [
    card.systemPrompt.trim(),
    context.length > 0 ? render(getPrompt("persona.searchContext"), { context }) : "",
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");

  return render(getPrompt("persona.system"), {
    name: card.name,
    personality:
      card.personality.trim().length > 0
        ? card.personality.trim()
        : getPrompt("persona.personality"),
    extra,
    mood: card.mood.toLowerCase(),
    tier: card.tier,
  });
}

export function influenceNote(influences: string[]): ChatMessage | null {
  if (influences.length === 0) return null;
  return {
    role: "system",
    content: render(getPrompt("persona.influence"), {
      influence: influences.map((line) => `- ${line}`).join(NEWLINE),
    }),
  };
}

export function buildChatMessages(
  card: CharacterCard,
  history: ChatMessage[],
  userText: string,
  influences: string[] = [],
  injectedContext?: string,
): ChatMessage[] {
  const note = influenceNote(influences);
  return [
    { role: "system", content: buildSystemPrompt(card, injectedContext) },
    ...history.slice(-CHAT_TURN.historyTurns),
    ...(note ? [note] : []),
    { role: "user", content: userText },
  ];
}
