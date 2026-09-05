import { jsonrepair } from "jsonrepair";

/**
 * Strips leading and trailing markdown code fences from a raw string.
 */
export function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    // Remove opening fence: ``` or ```json or ```anything
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Resilient JSON parser designed for local LLM outputs.
 * 1. Cleans markdown code fences.
 * 2. Attempts native JSON.parse.
 * 3. Catches any error and falls back to jsonrepair before failing.
 * 4. Returns fallback if supplied, or throws the encountered error.
 */
export function safeJsonParse<T>(raw: string, fallback?: T): T {
  const cleaned = stripCodeFences(raw);

  try {
    return JSON.parse(cleaned) as T;
  } catch (_nativeError) {
    try {
      const repaired = jsonrepair(cleaned);
      return JSON.parse(repaired) as T;
    } catch (repairError) {
      console.warn(
        `[safeJsonParse] Failed to parse JSON even after jsonrepair: ${
          repairError instanceof Error ? repairError.message : String(repairError)
        }`,
      );
      if (fallback !== undefined) {
        return fallback;
      }
      throw repairError instanceof Error ? repairError : new Error(String(repairError));
    }
  }
}
