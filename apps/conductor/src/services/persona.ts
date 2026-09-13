import { pronounsFor, render } from "@eidolon/config";
import { getPrompt } from "@/prompts/store";
import type { ChatMessage } from "@/services/llm";

const NEWLINE = String.fromCharCode(10);

export interface CharacterCard {
  name: string;
  personality: string;
  systemPrompt: string;
  scenario: string;
  rules: string;
  exampleDialogue: string;
  pronouns: string;
  likes?: string;
  dislikes?: string;
  mood: string;
  tier: string;
}

export function freshLineReminder(): string {
  return getPrompt("persona.freshLine");
}

export function mustSpeakReminder(): string {
  return getPrompt("persona.mustSpeak");
}

export function hardenedReminder(): string {
  return getPrompt("persona.hardenedReminder");
}

function block(key: string, variable: string, value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? render(getPrompt(key), { [variable]: trimmed }) : "";
}

export function buildSystemPrompt(card: CharacterCard, injectedContext?: string): string {
  const context = injectedContext?.trim() ?? "";
  const voice = pronounsFor(card.pronouns);
  const extra = [
    card.systemPrompt.trim(),
    render(getPrompt("persona.pronouns"), {
      subject: voice.subject,
      object: voice.object,
      possessive: voice.possessive,
    }),
    block("persona.scenario", "scenario", card.scenario),
    block("persona.rules", "rules", card.rules),
    (card.likes ?? "").trim().length > 0 || (card.dislikes ?? "").trim().length > 0
      ? render(getPrompt("persona.characterLikes"), {
          likes: (card.likes ?? "").trim() || "nothing in particular",
          dislikes: (card.dislikes ?? "").trim() || "nothing in particular",
        })
      : "",
    block("persona.exampleDialogue", "examples", card.exampleDialogue),
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
