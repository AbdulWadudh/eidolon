import { jsonrepair } from "jsonrepair";

export function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

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
