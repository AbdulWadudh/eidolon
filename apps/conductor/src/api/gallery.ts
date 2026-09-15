import { GALLERY } from "@eidolon/config";
import { type Context, Hono } from "hono";
import { ownerFor } from "@/auth/session";
import { getCharacter, ownsCharacter } from "@/db/characters";
import { countGallery, listGallery } from "@/db/gallery";
import { getCharacterLook, setCharacterAvatar } from "@/db/look";
import { deletePortrait } from "@/db/portraits";

export const gallery = new Hono();

async function user(c: Context) {
  return ownerFor(c.req.header("Authorization") ?? c.req.query("token"));
}

gallery.get("/:id/gallery", async (c) => {
  const id = c.req.param("id");
  const who = await user(c);
  if (!who) return c.json({ error: "Sign in to see this." }, 401);
  const asked = Number.parseInt(c.req.query("limit") ?? "", 10);
  const offset = Math.max(0, Number.parseInt(c.req.query("offset") ?? "", 10) || 0);
  const limit = Math.min(
    GALLERY.maxPageSize,
    Number.isFinite(asked) && asked > 0 ? asked : GALLERY.pageSize,
  );

  return c.json({
    images: listGallery(id, who.id, limit, offset),
    total: countGallery(id, who.id),
  });
});

gallery.delete("/:id/gallery/:imageId", async (c) => {
  const id = c.req.param("id");
  const imageId = c.req.param("imageId");

  const who = await user(c);
  if (!who) return c.json({ error: "Sign in to change this." }, 401);
  if (!ownsCharacter(id, who.id)) {
    return c.json({ error: "That character belongs to somebody else." }, 403);
  }

  if (imageId.startsWith("portrait:") || imageId.startsWith("adopted-")) {
    return deletePortrait(id, imageId)
      ? c.json({ deleted: true })
      : c.json({ error: "No such picture." }, 404);
  }

  return c.json({ error: "A photo is removed from the conversation it is in." }, 400);
});

gallery.post("/:id/avatar", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { url?: unknown };
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (url.length === 0) return c.json({ error: "Which picture?" }, 400);
  if (!getCharacter(id)) return c.json({ error: "No such character." }, 404);

  setCharacterAvatar(id, url);
  return c.json({ character: getCharacterLook(id) });
});
