import { STAGE_DIRECTIONS } from "@/config";

const ASTERISK = "*";
const WHITESPACE = /\s+/;

function wordCount(text: string): number {
  return text
    .trim()
    .split(WHITESPACE)
    .filter((word) => word.length > 0).length;
}

export function isBeat(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length > 0 && wordCount(trimmed) <= STAGE_DIRECTIONS.maxWords;
}

export interface ActionGate {
  push(chunk: string): string;
  flush(): string;
}

export function createActionGate(): ActionGate {
  let inside = false;
  let body = "";
  let kept = 0;

  function close(): string {
    const action = body.trim();
    body = "";
    inside = false;
    if (kept >= STAGE_DIRECTIONS.maxPerReply || !isBeat(action)) return "";
    kept += 1;
    return `${ASTERISK}${action}${ASTERISK}`;
  }

  return {
    push(chunk: string): string {
      let out = "";
      for (const character of chunk) {
        if (character === ASTERISK) {
          if (inside) out += close();
          else {
            inside = true;
            body = "";
          }
          continue;
        }
        if (inside) body += character;
        else out += character;
      }
      return out;
    },
    flush(): string {
      return inside ? close() : "";
    },
  };
}

export function isActionChunk(chunk: string): boolean {
  return /^\s*\*[^*]*\*\s*$/.test(chunk);
}

export function limitActions(text: string): string {
  const gate = createActionGate();
  return `${gate.push(text)}${gate.flush()}`.replace(/\s{2,}/g, " ").trim();
}

export function stripActions(text: string): string {
  return text
    .replace(/\*[^*]*\*?/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function hasAction(text: string): boolean {
  return /\*[^*]+\*/.test(text);
}
