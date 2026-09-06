import { API_ROUTES, QUEUE_JOBS } from "@eidolon/config";
import { Hono } from "hono";
import {
  type CharacterCard,
  createCharacter,
  deleteCharacter,
  getCharacter,
  listCharacters,
  updateCharacter,
} from "@/db/characters";
import { deleteLoreEntry, getLoreEntries, upsertLoreEntry } from "@/db/lorebook";
import { jobKey } from "@/queue/job-id";
import { enqueueGpuJob } from "@/queue/queues";

export const characters = new Hono();

type Draft = Partial<Omit<CharacterCard, "id">>;

const TEXT_FIELDS: Array<keyof Draft> = [
  "name",
  "tagline",
  "personality",
  "systemPrompt",
  "scenario",
  "rules",
  "exampleDialogue",
  "greeting",
];

export function readDraft(body: Record<string, unknown>): Draft {
  const draft: Draft = {};

  for (const field of TEXT_FIELDS) {
    const value = body[field];
    if (typeof value === "string") draft[field] = value;
  }

  return draft;
}

characters.get("/", (c) => c.json({ characters: listCharacters() }));

characters.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const draft = readDraft(body);

  if (!draft.name || draft.name.trim().length === 0) {
    return c.json({ error: "A character needs a name." }, 400);
  }

  return c.json({ character: createCharacter({ ...draft, name: draft.name }) }, 201);
});

characters.get("/:id", (c) => {
  const character = getCharacter(c.req.param("id"));
  if (!character) return c.json({ error: "No such character." }, 404);
  return c.json({ character });
});

characters.patch("/:id", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const draft = readDraft(body);

  if (Object.keys(draft).length === 0) {
    return c.json({ error: "Nothing to change." }, 400);
  }

  const updated = updateCharacter(c.req.param("id"), draft);
  if (!updated) return c.json({ error: "No such character." }, 404);
  return c.json({ character: updated });
});

characters.delete("/:id", (c) => {
  if (!deleteCharacter(c.req.param("id"))) {
    return c.json({ error: "No such character." }, 404);
  }
  return c.json({ ok: true });
});

characters.get("/:id/lore", (c) => c.json({ lore: getLoreEntries(c.req.param("id")) }));

characters.post("/:id/lore", async (c) => {
  const characterId = c.req.param("id");
  if (!getCharacter(characterId)) return c.json({ error: "No such character." }, 404);

  const body = (await c.req.json().catch(() => ({}))) as {
    id?: unknown;
    keys?: unknown;
    content?: unknown;
    requiredAffinity?: unknown;
    isActive?: unknown;
  };

  const keys = Array.isArray(body.keys)
    ? body.keys.filter((key): key is string => typeof key === "string" && key.trim().length > 0)
    : [];

  if (keys.length === 0) return c.json({ error: "A lore entry needs at least one keyword." }, 400);
  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    return c.json({ error: "A lore entry needs content." }, 400);
  }

  const id = upsertLoreEntry(
    characterId,
    {
      keys,
      content: body.content,
      requiredAffinity: typeof body.requiredAffinity === "number" ? body.requiredAffinity : 0,
      isActive: body.isActive !== false,
    },
    typeof body.id === "string" ? body.id : undefined,
  );

  return c.json({ lore: getLoreEntries(characterId).find((entry) => entry.id === id) }, 201);
});

characters.delete("/:id/lore/:entryId", (c) => {
  deleteLoreEntry(c.req.param("entryId"));
  return c.json({ ok: true });
});

characters.post("/:id/portrait", async (c) => {
  const characterId = c.req.param("id");
  const character = getCharacter(characterId);
  if (!character) return c.json({ error: "No such character." }, 404);

  const body = (await c.req.json().catch(() => ({}))) as { prompt?: unknown };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  // The render is minutes of GPU time, so the request only queues it. The
  // client learns the portrait landed through the look endpoint, the same way
  // it learns about every other picture.
  const jobId = await enqueueGpuJob(
    QUEUE_JOBS.generatePortrait,
    { characterId, prompt },
    { jobId: jobKey("portrait", characterId, Date.now()) },
  );

  return c.json({ queued: true, jobId: jobId ?? null }, 202);
});

export function mountCharacters(app: Hono): void {
  app.route(API_ROUTES.characters, characters);
}
