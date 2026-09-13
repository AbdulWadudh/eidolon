import type { Context } from "hono";
import type { NewLoreEntry } from "@/db/lorebook";

export type LoreBody = { value: NewLoreEntry } | { error: string };

export async function readLoreBody(c: Context): Promise<LoreBody> {
  const body = (await c.req.json().catch(() => ({}))) as {
    keys?: unknown;
    content?: unknown;
    requiredAffinity?: unknown;
    isActive?: unknown;
  };

  const keys = Array.isArray(body.keys)
    ? body.keys.filter((key): key is string => typeof key === "string" && key.trim().length > 0)
    : [];

  if (keys.length === 0) {
    return { error: "A lore entry needs at least one key to surface on." };
  }

  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    return { error: "A lore entry needs content." };
  }

  return {
    value: {
      keys: keys.map((key) => key.trim()),
      content: body.content.trim(),
      requiredAffinity:
        typeof body.requiredAffinity === "number" && Number.isFinite(body.requiredAffinity)
          ? Math.max(0, Math.round(body.requiredAffinity))
          : 0,
      isActive: body.isActive !== false,
    },
  };
}
