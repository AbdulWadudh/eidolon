import { CARD_UPLOAD } from "@eidolon/config";
import { type Context, Hono } from "hono";
import { ownerFor } from "@/auth/session";
import { getCharacter } from "@/db/characters";
import { exportFilename, exportTavernCard, parseTavernCard } from "@/services/card-parser";

export const cards = new Hono();

function pickUpload(body: Record<string, unknown>): File | null {
  for (const field of CARD_UPLOAD.fieldNames) {
    const value = body[field];
    if (value instanceof File) return value;
  }

  for (const value of Object.values(body)) {
    if (value instanceof File) return value;
  }

  return null;
}

async function ownerId(c: Context): Promise<string | null> {
  const owner = await ownerFor(c.req.header("Authorization") ?? c.req.query("token"));
  return owner?.id ?? null;
}

cards.post("/import", async (c) => {
  const body = await c.req.parseBody().catch(() => null);
  if (!body) return c.json({ success: false, error: "Send the card as multipart form data." }, 400);

  const upload = pickUpload(body as Record<string, unknown>);
  if (!upload) {
    return c.json(
      { success: false, error: `Attach the PNG as "${CARD_UPLOAD.fieldNames[0]}".` },
      400,
    );
  }

  if (upload.size > CARD_UPLOAD.maxBytes) {
    return c.json({ success: false, error: "That card is too large to import." }, 413);
  }

  const png = Buffer.from(new Uint8Array(await upload.arrayBuffer()));

  try {
    const imported = await parseTavernCard(png, { ownerId: await ownerId(c) });
    return c.json(
      {
        success: true,
        characterId: imported.character.id,
        character: imported.character,
        loreCount: imported.loreCount,
        anchorUrl: imported.anchorUrl,
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "That card could not be read.";
    return c.json({ success: false, error: message }, 422);
  }
});

cards.get("/:id/export", async (c) => {
  const id = c.req.param("id");
  if (!getCharacter(id)) return c.json({ error: "No such character." }, 404);

  try {
    const png = await exportTavernCard(id);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": CARD_UPLOAD.exportContentType,
        "Content-Disposition": `attachment; filename="${exportFilename(id)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "That card could not be written.";
    return c.json({ error: message }, 500);
  }
});
