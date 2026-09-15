import { REASONING } from "@eidolon/config";

const OPEN = REASONING.openTag;
const CLOSE = REASONING.closeTag;
const TAGS = [OPEN, CLOSE];

export function partialTagLength(text: string): number {
  let held = 0;
  for (const tag of TAGS) {
    const longest = Math.min(text.length, tag.length - 1);
    for (let length = longest; length > held; length -= 1) {
      if (text.endsWith(tag.slice(0, length))) {
        held = length;
        break;
      }
    }
  }
  return held;
}

export interface ReasoningFilter {
  push: (text: string) => string;
  flush: () => string;
  reasoning: () => string;
}

export function createReasoningFilter(holdChars = 0): ReasoningFilter {
  let pending = "";
  let thought = "";
  let held: string | null = holdChars > 0 ? "" : null;
  let inside = false;
  let sawOpen = false;

  function release(text: string): string {
    if (held === null) return text;
    held += text;
    if (held.length <= holdChars) return "";
    const out = held;
    held = null;
    return out;
  }

  function drain(final: boolean): string {
    let out = "";

    for (;;) {
      if (inside) {
        const close = pending.indexOf(CLOSE);
        if (close < 0) {
          const hold = final ? 0 : partialTagLength(pending);
          thought += pending.slice(0, pending.length - hold);
          pending = pending.slice(pending.length - hold);
          return out;
        }
        thought += pending.slice(0, close);
        pending = pending.slice(close + CLOSE.length);
        inside = false;
        continue;
      }

      const openAt = pending.indexOf(OPEN);
      const closeAt = pending.indexOf(CLOSE);

      if (openAt >= 0 && (closeAt < 0 || openAt < closeAt)) {
        out += release(pending.slice(0, openAt));
        pending = pending.slice(openAt + OPEN.length);
        inside = true;
        sawOpen = true;
        continue;
      }

      if (closeAt >= 0 && !sawOpen) {
        thought += (held ?? "") + out + pending.slice(0, closeAt);
        held = null;
        out = "";
        sawOpen = true;
        pending = pending.slice(closeAt + CLOSE.length);
        continue;
      }

      if (closeAt >= 0) {
        out += release(pending.slice(0, closeAt));
        pending = pending.slice(closeAt + CLOSE.length);
        continue;
      }

      break;
    }

    const hold = final ? 0 : partialTagLength(pending);
    out += release(pending.slice(0, pending.length - hold));
    pending = pending.slice(pending.length - hold);

    if (final && held !== null) {
      out += held;
      held = null;
    }

    return out;
  }

  return {
    push(text: string): string {
      if (text.length === 0) return "";
      pending += text;
      return drain(false);
    },
    flush(): string {
      return drain(true);
    },
    reasoning: () => thought,
  };
}

export function stripReasoning(text: string): string {
  const filter = createReasoningFilter(Number.POSITIVE_INFINITY);
  return filter.push(text) + filter.flush();
}

export function leaksReasoning(text: string): boolean {
  return text.includes(OPEN) || text.includes(CLOSE);
}
