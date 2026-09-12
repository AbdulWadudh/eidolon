import { type AuthorField, type AuthorMode, charactersUrl, TIMEOUTS_MS } from "@eidolon/config";
import type { Draft } from "./character-draft";

export type AuthorContext = Partial<Record<AuthorField, string>>;

export interface AuthorResult {
  text: string | null;
  error: string | null;
}

export function contextFrom(draft: Draft, exclude: AuthorField): AuthorContext {
  const { voice: _voice, ...rest } = draft;
  const context: AuthorContext = {};

  for (const [key, value] of Object.entries(rest)) {
    if (key === exclude) continue;
    if (typeof value === "string" && value.trim().length > 0) {
      context[key as AuthorField] = value;
    }
  }

  return context;
}

export async function authorField(
  host: string,
  field: AuthorField,
  mode: AuthorMode,
  draft: string,
  context: AuthorContext,
): Promise<AuthorResult> {
  if (!host) return { text: null, error: null };

  try {
    const res = await fetch(`${charactersUrl(host)}/author`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, mode, draft, context }),
      signal: AbortSignal.timeout(TIMEOUTS_MS.generation),
    });

    const body = (await res.json()) as { text?: string; error?: string };
    if (!res.ok) return { text: null, error: body.error ?? null };
    return { text: body.text ?? null, error: null };
  } catch {
    return { text: null, error: null };
  }
}
