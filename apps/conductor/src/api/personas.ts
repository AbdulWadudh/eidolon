import { API_ROUTES, PERSONA_COPY } from "@eidolon/config";
import type { Hono } from "hono";
import type { UserEnv } from "@/auth/guard";
import {
  addChapter,
  createPersona,
  deleteChapter,
  deletePersona,
  getPersona,
  listPersonas,
  makeDefaultPersona,
  type PersonaDraft,
  pinPersonaToCharacter,
  updateChapter,
  updatePersona,
} from "@/db/personas";

const TEXT_FIELDS = [
  "name",
  "photoUrl",
  "bio",
  "hobbies",
  "likes",
  "dislikes",
  "personality",
] as const;

export function readPersonaDraft(body: Record<string, unknown>): PersonaDraft {
  const draft: Record<string, string | null> = {};

  for (const field of TEXT_FIELDS) {
    const value = body[field];
    if (typeof value === "string") draft[field] = value;
    else if (value === null) draft[field] = null;
  }

  return draft as PersonaDraft;
}

export function mountPersonas(app: Hono<UserEnv>): void {
  const base = API_ROUTES.personas;

  app.get(base, (c) => c.json({ personas: listPersonas(c.get("user").id) }));

  app.post(base, async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const draft = readPersonaDraft(body);

    if (typeof draft.name !== "string" || draft.name.trim().length === 0) {
      return c.json({ error: PERSONA_COPY.needName }, 400);
    }

    return c.json({ persona: createPersona(c.get("user").id, draft) }, 201);
  });

  app.get(`${base}/:id`, (c) => {
    const persona = getPersona(c.req.param("id"), c.get("user").id);
    if (!persona) return c.json({ error: "No such persona." }, 404);
    return c.json({ persona });
  });

  app.patch(`${base}/:id`, async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const persona = updatePersona(c.req.param("id"), c.get("user").id, readPersonaDraft(body));

    if (!persona) return c.json({ error: "No such persona." }, 404);
    return c.json({ persona });
  });

  app.delete(`${base}/:id`, (c) => {
    if (!deletePersona(c.req.param("id"), c.get("user").id)) {
      return c.json({ error: "No such persona." }, 404);
    }
    return c.json({ personas: listPersonas(c.get("user").id) });
  });

  app.post(`${base}/:id/default`, (c) => {
    if (!makeDefaultPersona(c.req.param("id"), c.get("user").id)) {
      return c.json({ error: "No such persona." }, 404);
    }
    return c.json({ personas: listPersonas(c.get("user").id) });
  });

  app.post(`${base}/:id/chapters`, async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { title?: unknown; body?: unknown };

    if (typeof body.body !== "string" || body.body.trim().length === 0) {
      return c.json({ error: "A chapter needs something written in it." }, 400);
    }

    const persona = addChapter(
      c.req.param("id"),
      c.get("user").id,
      typeof body.title === "string" ? body.title.trim() || null : null,
      body.body.trim(),
    );

    if (!persona) return c.json({ error: "No such persona." }, 404);
    return c.json({ persona }, 201);
  });

  app.patch(`${base}/:id/chapters/:chapterId`, async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { title?: unknown; body?: unknown };

    const patch: { title?: string | null; body?: string } = {};
    if (typeof body.title === "string") patch.title = body.title.trim() || null;
    else if (body.title === null) patch.title = null;

    if (typeof body.body === "string") {
      if (body.body.trim().length === 0) {
        return c.json({ error: "A chapter needs something written in it." }, 400);
      }
      patch.body = body.body.trim();
    }

    const persona = updateChapter(
      c.req.param("chapterId"),
      c.req.param("id"),
      c.get("user").id,
      patch,
    );

    if (!persona) return c.json({ error: "No such persona." }, 404);
    return c.json({ persona });
  });

  app.delete(`${base}/:id/chapters/:chapterId`, (c) => {
    const persona = deleteChapter(c.req.param("chapterId"), c.req.param("id"), c.get("user").id);

    if (!persona) return c.json({ error: "No such persona." }, 404);
    return c.json({ persona });
  });

  app.put(`${API_ROUTES.characters}/:id/persona`, async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { personaId?: unknown };
    const personaId =
      typeof body.personaId === "string" && body.personaId.length > 0 ? body.personaId : null;

    if (!pinPersonaToCharacter(c.req.param("id"), c.get("user").id, personaId)) {
      return c.json({ error: "No such persona." }, 404);
    }

    return c.json({ personaId });
  });
}
