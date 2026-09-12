import { CHAT_TURN } from "@eidolon/config";
import { stripActions } from "@/services/stage-directions";

const SENTENCE_END = /[.!?…]["')\]]?(\s|$)/g;
const ASTERISK = /\*/g;

export function countSentences(reply: string): number {
  const spoken = reply.replace(/\*[^*]*\*/g, " ");
  SENTENCE_END.lastIndex = 0;
  let count = 0;
  while (SENTENCE_END.exec(spoken) !== null) count += 1;
  return count;
}

function isInsideAction(reply: string): boolean {
  ASTERISK.lastIndex = 0;
  return (reply.match(ASTERISK)?.length ?? 0) % 2 === 1;
}

export function hasSaidEnough(reply: string): boolean {
  const trimmed = reply.trimEnd();
  if (trimmed.length === 0) return false;
  if (isInsideAction(trimmed)) return false;
  if (!/[.!?…]["')\]]?$/.test(trimmed)) return false;

  return (
    countSentences(trimmed) >= CHAT_TURN.maxReplySentences ||
    trimmed.length >= CHAT_TURN.maxReplyChars
  );
}

export function spokenWords(reply: string): string {
  return stripActions(reply)
    .replace(/\([^)]*\)?/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isActionOnly(reply: string): boolean {
  const trimmed = reply.trim();
  if (trimmed.length === 0) return false;
  return !/[a-z]/i.test(spokenWords(trimmed));
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function repeatsHistory(reply: string, previous: string[]): boolean {
  const candidate = normalise(reply);
  if (candidate.length < 12) return false;
  return previous.some((entry) => normalise(entry) === candidate);
}
