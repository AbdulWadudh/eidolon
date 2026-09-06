import { WEB_CONTEXT } from "@eidolon/config";

const WORD = /[\p{L}\p{N}]+/gu;

/**
 * A search almost always returns something, and something is not an answer.
 * Asked who won the "Zorbulon Nebula Cup", the web offered a page about the
 * Nebula Awards and the model invented teams, a score and a penalty shootout
 * from it. The distinctive words in a question are the check: if the results
 * never say "zorbulon", they are not about what was asked.
 *
 * Only long words count, and common temporal ones are ignored, so "the weather
 * in Tokyo tomorrow" is not rejected for the absence of the word "tomorrow".
 */
export function distinctiveTerms(query: string): string[] {
  const words = query.toLowerCase().match(WORD) ?? [];

  return [
    ...new Set(
      words.filter(
        (word) =>
          word.length >= WEB_CONTEXT.distinctiveMinLength &&
          !WEB_CONTEXT.commonQueryWords.some((common) => common === word),
      ),
    ),
  ];
}

export function answersQuery(query: string, results: string): boolean {
  if (results.trim().length === 0) return false;

  const terms = distinctiveTerms(query);
  if (terms.length === 0) return true;

  const haystack = results.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
