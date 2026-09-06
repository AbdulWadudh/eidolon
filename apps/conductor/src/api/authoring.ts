import { isAuthorField, isAuthorMode } from "@eidolon/config";
import { Hono } from "hono";
import {
  type AuthorContext,
  AuthorUnavailableError,
  authorField,
} from "@/services/character-author";

/**
 * Writing and rewriting one field of a character card. Mounted under
 * /characters/author, apart from the CRUD routes because it is the only one
 * that spends GPU time.
 */
export const authoring = new Hono();

authoring.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  if (!isAuthorField(body.field)) return c.json({ error: "Unknown field." }, 400);
  if (!isAuthorMode(body.mode)) return c.json({ error: "Unknown mode." }, 400);

  const draft = typeof body.draft === "string" ? body.draft : "";
  const context =
    typeof body.context === "object" && body.context !== null
      ? (body.context as AuthorContext)
      : {};

  try {
    const text = await authorField({ field: body.field, mode: body.mode, draft, context });
    return c.json({ text });
  } catch (error) {
    if (error instanceof AuthorUnavailableError) return c.json({ error: error.message }, 503);
    throw error;
  }
});
