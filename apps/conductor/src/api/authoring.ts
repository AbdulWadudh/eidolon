import { isAuthorField, isAuthorMode } from "@eidolon/config";
import { Hono } from "hono";
import type { UserEnv } from "@/auth/guard";
import { surroundingContext } from "@/services/author-context";
import {
  type AuthorContext,
  AuthorUnavailableError,
  authorField,
} from "@/services/character-author";

export const authoring = new Hono<UserEnv>();

authoring.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  if (!isAuthorField(body.field)) return c.json({ error: "Unknown field." }, 400);
  if (!isAuthorMode(body.mode)) return c.json({ error: "Unknown mode." }, 400);

  const draft = typeof body.draft === "string" ? body.draft : "";
  const sent =
    typeof body.context === "object" && body.context !== null
      ? (body.context as AuthorContext)
      : {};

  const around = surroundingContext(
    body.field,
    c.get("user").id,
    typeof body.characterId === "string" ? body.characterId : undefined,
    typeof body.personaId === "string" ? body.personaId : undefined,
  );

  const context: AuthorContext = { ...around, ...sent };

  try {
    const text = await authorField({ field: body.field, mode: body.mode, draft, context });
    return c.json({ text });
  } catch (error) {
    if (error instanceof AuthorUnavailableError) return c.json({ error: error.message }, 503);
    throw error;
  }
});
