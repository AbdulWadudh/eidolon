import { WEB_CONTEXT } from "@/config";

const WORD = /[\p{L}\p{N}]+/gu;

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
