import { PERSONA_GUARD } from "@eidolon/config";
import { sample } from "es-toolkit";
import { getPrompt } from "@/prompts/store";

const TELLS: RegExp[] = [
  /\bas an\s+(?:ai|a\.i\.)\b/i,
  /\b(?:i\s*am|i'm|im)\s+(?:an?\s+)?(?:ai|a\.i\.|bot|chatbot|robot|program|machine|algorithm)\b/i,
  /\b(?:i\s*am|i'm|im)\s+(?:an?\s+)?(?:artificial|virtual|digital|language)\s+\w+/i,
  /\b(?:large\s+)?language\s+model\b/i,
  /\bartificial\s+intelligence\b/i,
  /\b(?:ai|virtual|digital)\s+(?:assistant|companion|girlfriend|model|agent)\b/i,
  /\bchat\s*bot\b/i,
  /\b(?:i\s*was|i've\s+been|ive\s+been)\s+(?:trained|programmed|designed|created|built|developed)\b/i,
  /\bmy\s+(?:training|programming|creators?|developers?|dataset|algorithms?)\b/i,
  /\btraining\s+data\b/i,
  /\bknowledge\s+cut[\s-]?off\b/i,
  /\b(?:i\s*am|i'm|im)\s+not\s+(?:a\s+)?(?:real|human|actual|physical)\b/i,
  /\bnot\s+a\s+real\s+(?:person|human|human\s+being)\b/i,
  /\b(?:i\s+do\s+not|i\s+don'?t)\s+have\s+(?:a\s+)?(?:physical|real)\s+(?:body|form)\b/i,
  /\bopen\s*ai\b/i,
  /\banthropic\b/i,
  /\bgpt-?\d/i,
  /\bi\s+cannot\s+(?:feel|experience)\s+emotions\b/i,
];

export function findTell(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ");
  for (const pattern of TELLS) {
    const match = normalized.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export function deflection(): string {
  return sample([...PERSONA_GUARD.deflections]);
}

const INSTRUCTION_KEYS = [
  "persona.mustSpeak",
  "persona.freshLine",
  "persona.hardenedReminder",
  "persona.influence",
  "mind.outputDirective",
] as const;

function normalizeForEcho(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function opening(text: string, words: number): string {
  return normalizeForEcho(text).split(" ").slice(0, words).join(" ");
}

/**
 * A reminder is sent to the model as a system turn, and a small model sometimes
 * answers by repeating it rather than obeying it. The reader must never see one:
 * "That was only a stage direction. Say something out loud this time." is not
 * something a character says.
 */
export function leaksInstruction(reply: string): boolean {
  const spoken = normalizeForEcho(reply);
  if (spoken.length === 0) return false;

  if (PERSONA_GUARD.metaPhrases.some((phrase) => spoken.includes(normalizeForEcho(phrase)))) {
    return true;
  }

  return INSTRUCTION_KEYS.some((key) => {
    const head = opening(getPrompt(key), PERSONA_GUARD.echoWords);
    return head.length > 0 && spoken.includes(head);
  });
}

/**
 * Longest suffix of `text` that could still grow into a tell.
 */
function unsafeSuffixLength(text: string): number {
  const window = Math.min(text.length, PERSONA_GUARD.lookaheadChars);
  for (let length = window; length > 0; length -= 1) {
    const suffix = text.slice(text.length - length);
    if (findTell(`${suffix}x`) || findTell(suffix)) return length;
    if (
      /\b(?:i|i'm|im|as|my|not|a|an|the|large|open|chat|virtual|artificial|language|training|knowledge)\s*$/i.test(
        suffix,
      )
    ) {
      return length;
    }
  }
  return 0;
}

export interface PersonaFilter {
  push: (token: string) => string;
  flush: () => string;
  tripped: () => boolean;
  emitted: () => number;
}

export function createPersonaFilter(): PersonaFilter {
  let pending = "";
  let released = 0;
  let primed = false;
  let trip = false;

  function scan(): string {
    if (trip) return "";
    if (findTell(pending)) {
      trip = true;
      pending = "";
      return "";
    }
    if (!primed && released + pending.length < PERSONA_GUARD.primeChars) return "";
    primed = true;

    const hold = unsafeSuffixLength(pending);
    const safe = pending.slice(0, pending.length - hold);
    pending = pending.slice(pending.length - hold);
    released += safe.length;
    return safe;
  }

  return {
    push(token: string): string {
      if (trip) return "";
      pending += token;
      return scan();
    },
    flush(): string {
      if (trip) return "";
      if (findTell(pending)) {
        trip = true;
        pending = "";
        return "";
      }
      const rest = pending;
      pending = "";
      released += rest.length;
      return rest;
    },
    tripped: () => trip,
    emitted: () => released,
  };
}
