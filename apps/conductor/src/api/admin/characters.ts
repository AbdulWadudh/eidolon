import { AdminCharacterDraftSchema } from "@eidolon/protocol";
import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import {
  createCharacter,
  deleteCharacter,
  getCharacter,
  listCharacters,
  updateCharacter,
} from "@/db/characters";

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
