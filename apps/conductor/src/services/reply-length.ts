import { CHAT_TURN } from "@eidolon/config";

const SENTENCE_END = /[.!?…]["')\]]?(\s|$)/g;
const ASTERISK = /\*/g;

/**
 * How many finished sentences the reply carries, ignoring anything inside
 * *asterisks* so a full stop in an action does not count as a sentence and
 * cut the reply short before a word is spoken.
 */
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

/**
 * True once the reply has said enough, by sentence count or sheer length.
 * Only ever true at a sentence boundary and never mid-action, so the cut lands
 * somewhere a reader would have paused anyway rather than mid-word.
 */
export function hasSaidEnough(reply: string): boolean {
  const trimmed = reply.trimEnd();
  if (trimmed.length === 0) return false;
  if (isInsideAction(trimmed)) return false;
  if (!/[.!?…]["')\]]?$/.test(trimmed)) return false;

  // Either budget ends the turn: three sentences, or one that simply ran long.
  return (
    countSentences(trimmed) >= CHAT_TURN.maxReplySentences ||
    trimmed.length >= CHAT_TURN.maxReplyChars
  );
}
