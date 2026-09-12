import { OUTPUT_TAGS } from "@eidolon/config";
import { STOP_TOKENS } from "@/services/llm-profile";

const DROPPED = [OUTPUT_TAGS.speechOpen, OUTPUT_TAGS.speechClose, ...STOP_TOKENS];
const ALL = [...DROPPED, OUTPUT_TAGS.visualOpen, OUTPUT_TAGS.visualClose];

export function heldSuffixLength(text: string): number {
  let held = 0;
  for (const tag of ALL) {
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

export interface OutputTags {
  push: (text: string) => string;
  flush: () => string;
  visualPrompt: () => string;
}

export function createOutputTags(): OutputTags {
  let pending = "";
  let visual = "";
  let capturing = false;

  function drain(final: boolean): string {
    let out = "";

    for (;;) {
      if (capturing) {
        const close = pending.indexOf(OUTPUT_TAGS.visualClose);
        if (close < 0) {
          const hold = final ? 0 : heldSuffixLength(pending);
          visual += pending.slice(0, pending.length - hold);
          pending = pending.slice(pending.length - hold);
          return out;
        }
        visual += pending.slice(0, close);
        pending = pending.slice(close + OUTPUT_TAGS.visualClose.length);
        capturing = false;
        continue;
      }

      let at = -1;
      let found = "";
      for (const tag of ALL) {
        const index = pending.indexOf(tag);
        if (index < 0) continue;
        if (at < 0 || index < at || (index === at && tag.length > found.length)) {
          at = index;
          found = tag;
        }
      }

      if (at < 0) break;

      out += pending.slice(0, at);
      pending = pending.slice(at + found.length);
      if (found === OUTPUT_TAGS.visualOpen) capturing = true;
    }

    const hold = final ? 0 : heldSuffixLength(pending);
    out += pending.slice(0, pending.length - hold);
    pending = pending.slice(pending.length - hold);
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
    visualPrompt: () => visual.trim(),
  };
}
