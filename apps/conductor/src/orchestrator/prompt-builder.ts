import { PROMPT_BUDGET, render, STATUS_COPY, WEB_CONTEXT, WORKING_CONTEXT } from "@eidolon/config";
import { getCharacterCard, getCharacterMind, getRecentMessages } from "@/db";
import { getActiveChronicle } from "@/orchestrator/chronicle";
import { loreContext } from "@/orchestrator/lorebook";
import { recallMemories } from "@/orchestrator/memory-manager";
import { shouldSearchWeb } from "@/orchestrator/search-trigger";
import { getPrompt } from "@/prompts/store";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { buildSystemPrompt } from "@/services/persona";
import { forHistory } from "@/services/photo-line";
import { searchWeb } from "@/services/search";
import { answersQuery } from "@/services/search-relevance";

const NEWLINE = String.fromCharCode(10);
const SECTION_BREAK = String.fromCharCode(10, 10);

export interface AssembledPrompt {
  messages: ChatMessage[];
  sections: Record<string, string>;
  searched: boolean;
  searchAttempted: boolean;
  budgetExceeded: boolean;
  characterName: string;
  affinity: number;
  tier: string;
  mood: string;
}

export const REQUIRED_SECTIONS = ["persona", "state", "directive"] as const;

export interface AssembleOptions {
  characterId: string;
  userText: string;
  allowSearch: boolean;
  influences?: string[];
  onStatus?: (status: string, detail: string) => void;
  signal?: AbortSignal;
}

export function stateDirective(affinity: number, tier: string, mood: string): string {
  return `[Character State: Affinity=${affinity}/100, Tier="${tier}", Current Mood="${mood}"]`;
}

export function outputDirective(): string {
  return getPrompt("mind.outputDirective");
}

export function workingHistory(characterId: string): ChatMessage[] {
  return getRecentMessages(characterId, WORKING_CONTEXT.windowSize)
    .map((entry) => ({
      role: entry.role,
      content: forHistory(entry.role, entry.content, entry.imageCaption),
    }))
    .filter((entry) => entry.content.trim().length > 0);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / PROMPT_BUDGET.charsPerToken);
}

export function orderedSections(sections: Record<string, string>): string[] {
  return PROMPT_BUDGET.sectionOrder
    .map((name) => sections[name] ?? "")
    .filter((body) => body.trim().length > 0);
}

export function withinBudget(sections: Record<string, string>): boolean {
  return orderedSections(sections).join(SECTION_BREAK).length <= PROMPT_BUDGET.maxChars;
}

export function trimToBudget(sections: Record<string, string>): Record<string, string> {
  const trimmed = { ...sections };
  const droppable = [...PROMPT_BUDGET.sectionOrder]
    .filter((name) => !REQUIRED_SECTIONS.some((required) => required === name))
    .reverse();

  for (const name of droppable) {
    if (withinBudget(trimmed)) break;
    trimmed[name] = "";
  }

  return trimmed;
}

export interface WebOutcome {
  block: string;
  attempted: boolean;
  found: boolean;
}

async function gatherWeb(
  userText: string,
  allowSearch: boolean,
  onStatus: AssembleOptions["onStatus"],
): Promise<WebOutcome> {
  if (!shouldSearchWeb(userText, allowSearch)) {
    return { block: "", attempted: false, found: false };
  }

  onStatus?.("searching", WEB_CONTEXT.searchingDetail || STATUS_COPY.searching.line);
  const results = await searchWeb(userText);

  // A question about something current that the web could not answer is the
  // exact case where the model invents a winner, a score or a date. Saying so
  // is the answer, so the silence is made explicit rather than left as a gap.
  if (!answersQuery(userText, results)) {
    return { block: WEB_CONTEXT.emptyHeader, attempted: true, found: false };
  }

  return { block: results, attempted: true, found: true };
}

export async function assemblePrompt(options: AssembleOptions): Promise<AssembledPrompt> {
  const { characterId, userText, allowSearch } = options;

  const card = getCharacterCard(characterId);
  const mind = getCharacterMind(characterId);

  const [web, lore, recall] = await Promise.all([
    gatherWeb(userText, allowSearch, options.onStatus),
    loreContext(characterId, userText, mind.score),
    recallMemories(characterId, userText),
  ]);

  const sections: Record<string, string> = {
    persona: buildSystemPrompt(card),
    state: stateDirective(mind.score, mind.tier, mind.mood),
    chronicle: getActiveChronicle(characterId),
    recall,
    lore,
    web: web.block,
    directive: outputDirective(),
  };

  const budgeted = trimToBudget(sections);
  const budgetExceeded = !withinBudget(budgeted);

  if (budgetExceeded) {
    console.warn(
      `[prompt] ${card.name}'s persona and directive alone run past ${PROMPT_BUDGET.maxChars} characters. Nothing optional is left to drop; shorten the character's system prompt.`,
    );
  }

  const influences = options.influences ?? [];
  const influenceNote =
    influences.length > 0
      ? render(getPrompt("persona.influence"), {
          influence: influences.map((line) => `- ${line}`).join(NEWLINE),
        })
      : "";

  // The facts arrive as encyclopedia prose and the model answers in whatever
  // register it was just handed. Telling it how to speak buried in a long system
  // blob does not survive that; the same words directly before the user's turn
  // do, because recency is the only lever a small model reliably feels.
  const webVoice = web.attempted
    ? getPrompt(web.found ? "persona.webAnswerOnly" : "persona.noWebResult")
    : "";

  const messages: ChatMessage[] = [
    { role: "system", content: orderedSections(budgeted).join(SECTION_BREAK) },
    ...workingHistory(characterId),
    ...(influenceNote ? [{ role: "system", content: influenceNote }] : []),
    ...(webVoice ? [{ role: "system", content: webVoice }] : []),
    { role: "user", content: userText },
  ];

  return {
    messages,
    sections: budgeted,
    searched: web.found,
    searchAttempted: web.attempted,
    budgetExceeded,
    characterName: card.name,
    affinity: mind.score,
    tier: mind.tier,
    mood: mind.mood,
  };
}

export { searchWeb, shouldSearchWeb, streamChatCompletion };
