import { GALLERY } from "@eidolon/config";
import { Hono } from "hono";
import { getCharacter } from "@/db/characters";
import { countGallery, listGallery } from "@/db/gallery";
import { getCharacterLook, setCharacterAvatar } from "@/db/look";
import { deletePortrait } from "@/db/portraits";

/**
 * Everything ever rendered for a character, and the two things a reader can do
 * to it: make one her profile picture, or remove one for good.
 */
export const gallery = new Hono();

gallery.get("/:id/gallery", (c) => {
  const id = c.req.param("id");
  const asked = Number.parseInt(c.req.query("limit") ?? "", 10);
  const offset = Math.max(0, Number.parseInt(c.req.query("offset") ?? "", 10) || 0);
  const limit = Math.min(
    GALLERY.maxPageSize,
    Number.isFinite(asked) && asked > 0 ? asked : GALLERY.pageSize,
  );

  return c.json({ images: listGallery(id, limit, offset), total: countGallery(id) });
});

gallery.delete("/:id/gallery/:imageId", (c) => {
  const id = c.req.param("id");
  const imageId = c.req.param("imageId");

  // Only a picture the reader asked to remove is ever removed. A portrait no
  // longer in use stays in her gallery until it is deleted by hand.
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
