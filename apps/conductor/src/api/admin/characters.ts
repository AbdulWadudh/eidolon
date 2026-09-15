import { AdminCharacterDraftSchema } from "@eidolon/protocol";
import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import { listAccounts } from "@/auth/roles";
import { countMessages } from "@/db";
import {
  createCharacter,
  deleteCharacter,
  getCharacter,
  listCharacters,
  updateCharacter,
  updateCharacterOwner,
} from "@/db/characters";
import { countChronicles } from "@/db/chronicles";
import { ownerEmail } from "@/db/owner";
import { summarizeChronicleNow } from "@/orchestrator/chronicle";
import { cancelProactive, pendingProactive } from "@/orchestrator/proactive";
import { queueOwnerRelocation } from "@/services/owner-move";

export const adminCharacters = new Hono<OwnerEnv>();

const NO_SUCH = "No such character.";

adminCharacters.get("/", (c) => c.json({ characters: listCharacters() }));

adminCharacters.get("/:id", (c) => {
  const character = getCharacter(c.req.param("id"));
  if (!character) return c.json({ error: NO_SUCH }, 404);
  return c.json({ character });
});

adminCharacters.post("/", async (c) => {
  const parsed = AdminCharacterDraftSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success || !parsed.data.name) {
    return c.json({ error: "A character needs a name." }, 400);
  }

  const created = createCharacter({
    ...parsed.data,
    name: parsed.data.name,
    ownerId: c.get("owner").id,
  });

  return c.json({ character: created }, 201);
});

adminCharacters.patch("/:id", async (c) => {
  const id = c.req.param("id");
  if (!getCharacter(id)) return c.json({ error: NO_SUCH }, 404);

  const parsed = AdminCharacterDraftSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "That is not a character draft." }, 400);
  if (Object.keys(parsed.data).length === 0) return c.json({ error: "Nothing to change." }, 400);

  return c.json({ character: updateCharacter(id, parsed.data) });
});

adminCharacters.delete("/:id", (c) => {
  const id = c.req.param("id");
  if (!getCharacter(id)) return c.json({ error: NO_SUCH }, 404);

  deleteCharacter(id);
  return c.json({ ok: true });
});

adminCharacters.get("/:id/operations", async (c) => {
  const id = c.req.param("id");
  const character = getCharacter(id);
  if (!character) return c.json({ error: NO_SUCH }, 404);

  const userId = character.ownerId ?? c.get("owner").id;

  return c.json({
    messages: countMessages(id, userId),
    chapters: countChronicles(id, userId),
    proactive: await pendingProactive(id, userId),
  });
});

adminCharacters.post("/:id/summarize", async (c) => {
  const id = c.req.param("id");
  if (!getCharacter(id)) return c.json({ error: NO_SUCH }, 404);

  const jobId = await summarizeChronicleNow(id, getCharacter(id)?.ownerId ?? c.get("owner").id);
  if (!jobId) return c.json({ error: "There is nothing said yet to summarise." }, 400);

  c.set("auditDetail", `queued a chapter for ${id}`);
  return c.json({ queued: true, jobId });
});

adminCharacters.patch("/:id/owner", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.ownerId !== "string") {
    return c.json({ error: "A valid ownerId is required." }, 400);
  }

  const from = ownerEmail(id);
  const updated = updateCharacterOwner(id, body.ownerId);
  if (!updated) return c.json({ error: NO_SUCH }, 404);

  queueOwnerRelocation(id, from);

  return c.json({ character: updated });
});

adminCharacters.get("/users", (c) => {
  return c.json({ users: listAccounts() });
});

adminCharacters.delete("/:id/proactive", async (c) => {
  const id = c.req.param("id");
  if (!getCharacter(id)) return c.json({ error: NO_SUCH }, 404);

  const cancelled = await cancelProactive(id, getCharacter(id)?.ownerId ?? c.get("owner").id);
  if (!cancelled) return c.json({ error: "Nothing is waiting to be sent." }, 404);

  c.set("auditDetail", `cancelled the pending message for ${id}`);
  return c.json({ ok: true });
});
