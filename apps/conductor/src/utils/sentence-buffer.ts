import { isSentenceBoundary, isSentenceTrailing, SENTENCE_BUFFER } from "@eidolon/config";

const STAGE_DIRECTION = /\*[^*]*\*/g;
const STRAY_ASTERISK = /\*/g;
const COLLAPSE = /\s+/g;

export function speakableSentence(raw: string): string {
  return raw
    .replace(STAGE_DIRECTION, " ")
    .replace(STRAY_ASTERISK, " ")
    .replace(COLLAPSE, " ")
    .trim();
}

function cutPoint(buffer: string): number {
  let inside = false;

  for (let index = 0; index < buffer.length; index += 1) {
    const character = buffer[index] ?? "";

    if (character === "*") {
      inside = !inside;
      continue;
    }

    if (inside || !isSentenceBoundary(character)) continue;

    let end = index + 1;
    while (
      end < buffer.length &&
      (isSentenceBoundary(buffer[end] ?? "") || isSentenceTrailing(buffer[end] ?? ""))
    ) {
      end += 1;
    }
    return end;
  }

  if (inside || buffer.length <= SENTENCE_BUFFER.maxBufferChars) return 0;

  const lastSpace = buffer.lastIndexOf(" ", SENTENCE_BUFFER.maxBufferChars);
  return lastSpace > 0 ? lastSpace + 1 : SENTENCE_BUFFER.maxBufferChars;
}

export interface SentenceBuffer {
  push(token: string): string[];
  flush(): string[];
  pending(): string;
}

export function createSentenceBuffer(): SentenceBuffer {
  let buffer = "";

  function take(upTo: number): string | null {
    const segment = buffer.slice(0, upTo);
    buffer = buffer.slice(upTo);
    const spoken = speakableSentence(segment);
    return spoken.length >= SENTENCE_BUFFER.minSpeakableChars ? spoken : null;
  }

  return {
    push(token) {
      buffer += token;
      const emitted: string[] = [];

      for (;;) {
        const cut = cutPoint(buffer);
        if (cut <= 0) break;
        const spoken = take(cut);
        if (spoken) emitted.push(spoken);
      }

      return emitted;
    },

    flush() {
      const spoken = take(buffer.length);
      return spoken ? [spoken] : [];
    },

    pending() {
      return buffer;
    },
  };
}

export function splitSpokenSentences(text: string): string[] {
  const buffer = createSentenceBuffer();
  return [...buffer.push(text), ...buffer.flush()];
}
