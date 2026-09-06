import { API_ROUTES, CHARACTER_PRESETS, presetByKey, QUEUE_JOBS } from "@eidolon/config";
import { type Context, Hono } from "hono";
import { authoring } from "@/api/authoring";
import { cards } from "@/api/cards";
import { gallery } from "@/api/gallery";
import { ownerFor } from "@/auth/session";
import {
  adopt,
  type CharacterCard,
  createCharacter,
  deleteCharacter,
  forkCharacter,
  getCharacter,
  listCharacters,
  ownsCharacter,
  setPublic,
  updateCharacter,
} from "@/db/characters";
import { deleteLoreEntry, getLoreEntries, upsertLoreEntry } from "@/db/lorebook";
import { jobKey } from "@/queue/job-id";
import { enqueueGpuJob } from "@/queue/queues";

export const characters = new Hono();

type Draft = Partial<Omit<CharacterCard, "id" | "ownerId" | "isPublic" | "forkedFrom">>;

const TEXT_FIELDS: Array<keyof Draft> = [
  "name",
  "tagline",
  "personality",
  "systemPrompt",
  "scenario",
  "rules",
  "exampleDialogue",
  "greeting",
  "voice",
];

export function readDraft(body: Record<string, unknown>): Draft {
  const draft: Record<string, string> = {};

  for (const field of TEXT_FIELDS) {
    const value = body[field];
    if (typeof value === "string") draft[field] = value;
  }

  return draft as Draft;
}

async function requireOwner(c: Context) {
  return ownerFor(c.req.header("Authorization") ?? c.req.query("token"));
}

characters.get("/", async (c) => {
  const owner = await requireOwner(c);
  return c.json({ characters: listCharacters(owner?.id), owner: owner?.id ?? null });
});

characters.get("/presets", (c) => c.json({ presets: CHARACTER_PRESETS }));

characters.post("/presets/:key", async (c) => {
  const preset = presetByKey(c.req.param("key"));
  if (!preset) return c.json({ error: "No such preset." }, 404);

  const body = (await c.req.json().catch(() => ({}))) as { name?: unknown };
  const name =
    typeof body.name === "string" && body.name.trim().length > 0 ? body.name : preset.name;

  const owner = await requireOwner(c);
  const created = createCharacter({
    ownerId: owner?.id ?? null,
    name,
    tagline: preset.tagline,
    personality: preset.personality,
    systemPrompt: preset.systemPrompt,
    scenario: preset.scenario,
    rules: preset.rules,
    exampleDialogue: preset.exampleDialogue,
    greeting: preset.greeting,
    voice: preset.voice,
  });

  for (const entry of preset.lore) {
    upsertLoreEntry(created.id, {
      keys: entry.keys,
      content: entry.content,
      requiredAffinity: entry.requiredAffinity,
    });
  }

  // The portrait is minutes of GPU time, so it is queued rather than awaited.
  // The character is usable the moment this returns; her face arrives later.
  const portraitJob = await enqueueGpuJob(
    QUEUE_JOBS.generatePortrait,
    { characterId: created.id, prompt: preset.portraitPrompt },
    { jobId: jobKey("portrait", created.id, Date.now()) },
  );

  return c.json(
    { character: created, lore: getLoreEntries(created.id), portraitJob: portraitJob ?? null },
    201,
  );
});

characters.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const draft = readDraft(body);

  if (!draft.name || draft.name.trim().length === 0) {
    return c.json({ error: "A character needs a name." }, 400);
  }

  const owner = await requireOwner(c);
  return c.json(
    { character: createCharacter({ ...draft, name: draft.name, ownerId: owner?.id ?? null }) },
    201,
  );
});

characters.get("/:id", async (c) => {
  const id = c.req.param("id");
  const character = getCharacter(id);
  if (!character) return c.json({ error: "No such character." }, 404);

  // Whether editing this will change it or fork it is the server's answer, not
  // something the client can work out from an owner id it never sees.
  const owner = await requireOwner(c);
  return c.json({ character, isMine: owner ? ownsCharacter(id, owner.id) : false });
});

characters.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const draft = readDraft(body);

  if (Object.keys(draft).length === 0) {
    return c.json({ error: "Nothing to change." }, 400);
  }

  const existing = getCharacter(id);
  if (!existing) return c.json({ error: "No such character." }, 404);

  const owner = await requireOwner(c);
  if (!owner) return c.json({ error: "Sign in to change a character." }, 401);

  // Editing something you wrote changes it. Editing someone else's, or a preset
  // you were given, makes it yours instead and leaves theirs alone.
  if (!ownsCharacter(id, owner.id)) {
    const fork = forkCharacter(existing, owner.id, draft);
    for (const entry of getLoreEntries(id)) {
      upsertLoreEntry(fork.id, {
        keys: entry.keys,
        content: entry.content,
        requiredAffinity: entry.requiredAffinity,
        isActive: entry.isActive,
      });
    }
    return c.json({ character: fork, forked: true }, 201);
  }

  adopt(id, owner.id);
  const updated = updateCharacter(id, draft);
  return c.json({ character: updated, forked: false });
});

characters.post("/:id/publish", async (c) => {
  const id = c.req.param("id");
  if (!getCharacter(id)) return c.json({ error: "No such character." }, 404);

  const owner = await requireOwner(c);
  if (!owner) return c.json({ error: "Sign in to publish a character." }, 401);
  if (!ownsCharacter(id, owner.id)) {
    return c.json({ error: "Only her author can publish her." }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as { isPublic?: unknown };
  adopt(id, owner.id);

  return c.json({ character: setPublic(id, body.isPublic !== false) });
});

characters.delete("/:id", async (c) => {
  const id = c.req.param("id");
  if (!getCharacter(id)) return c.json({ error: "No such character." }, 404);

  const owner = await requireOwner(c);
  if (!owner || !ownsCharacter(id, owner.id)) {
    return c.json({ error: "Only her author can remove her." }, 403);
  }

  deleteCharacter(id);
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

characters.route("/author", authoring);
characters.route("/", cards);
characters.route("/", gallery);

export function mountCharacters(app: Hono): void {
  app.route(API_ROUTES.characters, characters);
}
