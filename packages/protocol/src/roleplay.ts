export const INFLUENCE_OPEN = "<";
export const INFLUENCE_CLOSE = ">";

/**
 * Angle brackets around a short direction, with no padding space inside.
 * Nobody types "< be shy >", so requiring the run to begin and end on a
 * non-space keeps an ordinary comparison like "5 < 10 and 20 > 15" from
 * swallowing half a sentence. It must carry a letter too.
 */
const INFLUENCE_BLOCK = /<(\S|\S[^<>\r\n]{0,158}\S)>/g;
const HAS_LETTER = /[a-z]/i;

function isDirection(inner: string): boolean {
  return inner.trim().length > 0 && HAS_LETTER.test(inner);
}

export interface SplitInfluence {
  spoken: string;
  influences: string[];
}

export function splitInfluence(raw: string): SplitInfluence {
  const influences: string[] = [];
  INFLUENCE_BLOCK.lastIndex = 0;

  const spoken = raw
    .replace(INFLUENCE_BLOCK, (match, inner: string) => {
      if (!isDirection(inner)) return match;
      influences.push(inner.trim());
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  return { spoken, influences };
}

export function stripInfluence(raw: string): string {
  return splitInfluence(raw).spoken;
}

export function hasInfluence(raw: string): boolean {
  return splitInfluence(raw).influences.length > 0;
}
