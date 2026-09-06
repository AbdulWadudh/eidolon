import { PROMPT_BUDGET, render, STATUS_COPY, WEB_CONTEXT, WORKING_CONTEXT } from "@eidolon/config";
import { getCharacterCard, getCharacterMind, getRecentMessages } from "@/db";
import { getActiveChronicle } from "@/orchestrator/chronicle";
import { loreContext } from "@/orchestrator/lorebook";
import { recallMemories } from "@/orchestrator/memory-manager";
import { shouldSearchWeb } from "@/orchestrator/search-trigger";
import { getPrompt } from "@/prompts/store";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { buildSystemPrompt } from "@/services/persona";
import { leaksInstruction } from "@/services/persona-guard";
import { forHistory } from "@/services/photo-line";
import { searchWeb } from "@/services/search";
import { answersQuery } from "@/services/search-relevance";
import { stripSpeakerLabel } from "@/services/self-reference";

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

export function clip(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

/**
 * Newest first until the character budget is spent, so a pasted wall of text
 * costs itself and the turns behind it rather than the whole context. Counting
 * messages alone bounds nothing: a typed message has no maximum length.
 */
export function fitHistory(messages: ChatMessage[], budget: number): ChatMessage[] {
  const kept: ChatMessage[] = [];
  let spent = 0;

  for (const message of [...messages].reverse()) {
    const content = clip(message.content, WORKING_CONTEXT.maxMessageChars);
    if (spent + content.length > budget) break;
    spent += content.length;
    kept.push({ role: message.role, content });
  }

  return kept.reverse();
}

export function workingHistory(characterId: string, budget: number): ChatMessage[] {
  const recent = getRecentMessages(characterId, WORKING_CONTEXT.windowSize)
    .map((entry) => ({
      role: entry.role,
      // A reply that opened with the reader's own label is already recorded, and
      // reading it back is what teaches the model to keep doing it. Stripped at
      // read time as well as write time, so turns recorded before the guard
      // existed stop compounding.
      content:
        entry.role === "assistant"
          ? stripSpeakerLabel(forHistory(entry.role, entry.content, entry.imageCaption), "")
          : forHistory(entry.role, entry.content, entry.imageCaption),
    }))
    // A reminder that once leaked into a reply is still sitting in the
    // transcript, and every later turn reads it back. Left in, the model sees a
    // conversation that broke down and starts apologising for things that never
    // happened. Dropping it here heals turns that were already recorded.
    .filter((entry) => entry.content.trim().length > 0)
    .filter((entry) => entry.role !== "assistant" || !leaksInstruction(entry.content));

  return fitHistory(recent, budget);
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
  const influenceNote: string =
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

  const system = orderedSections(budgeted).join(SECTION_BREAK);
  const spokenTurn = clip(userText, WORKING_CONTEXT.maxMessageChars);

  // Everything mandatory is counted first. Whatever is left of the budget buys
  // history, so the total prompt is bounded no matter what was pasted into it.
  const historyBudget = Math.max(
    0,
    Math.min(
      WORKING_CONTEXT.maxHistoryChars,
      PROMPT_BUDGET.maxChars - system.length - spokenTurn.length - influenceNote.length,
    ),
  );

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...workingHistory(characterId, historyBudget),
    ...(influenceNote ? [{ role: "system", content: influenceNote }] : []),
    ...(webVoice ? [{ role: "system", content: webVoice }] : []),
    { role: "user", content: spokenTurn },
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
