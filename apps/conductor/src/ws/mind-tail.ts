import { MIND_UPDATE } from "@eidolon/config";

const MARKER = MIND_UPDATE.marker;

export function partialMarkerLength(text: string): number {
  const window = Math.min(text.length, MARKER.length - 1);
  for (let length = window; length > 0; length -= 1) {
    if (text.endsWith(MARKER.slice(0, length))) return length;
  }
  return 0;
}

export interface MindTail {
  push: (text: string) => string;
  flush: () => string;
  captured: () => string;
  isCapturing: () => boolean;
}

export function createMindTail(): MindTail {
  let pending = "";
  let capture = "";
  let capturing = false;

  return {
    push(text: string): string {
      if (text.length === 0) return "";
      if (capturing) {
        capture += text;
        return "";
      }

      pending += text;
      const start = pending.indexOf(MARKER);

      if (start >= 0) {
        const safe = pending.slice(0, start);
        capture = pending.slice(start);
        capturing = true;
        pending = "";
        return safe;
      }

      const hold = partialMarkerLength(pending);
      const safe = pending.slice(0, pending.length - hold);
      pending = pending.slice(pending.length - hold);
      return safe;
    },

    flush(): string {
      if (capturing) return "";
      const rest = pending;
      pending = "";
      return rest;
    },

    captured: () => capture,
    isCapturing: () => capturing,
  };
}
