import { afterEach, describe, expect, it } from "bun:test";
import { CARD_UPLOAD, characterExportPath, characterImportPath } from "@eidolon/config";
import { db } from "@/db";
import { app } from "@/index";
import { readCardData, readCardJson } from "@/services/tavern-card";
import { remember, wipe } from "./support/characters";
import { blankPng, cardPng, V2_CARD } from "./support/tavern-cards";

function upload(png: Buffer, field = CARD_UPLOAD.fieldNames[0] ?? "card"): FormData {
  const body = new FormData();
  body.append(field, new File([new Uint8Array(png)], "card.png", { type: "image/png" }));
  return body;
}

async function post(body: FormData): Promise<Response> {
  return app.request(characterImportPath(), { method: "POST", body });
}

function forget(characterId: unknown): void {
  if (typeof characterId === "string") remember({ id: characterId });
}

afterEach(wipe);

describe("POST /characters/import", () => {
  it("imports a Tavern card and answers with its new id", async () => {
    const response = await post(upload(await cardPng()));
    const body = (await response.json()) as { success?: boolean; characterId?: string };
    forget(body.characterId);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.characterId).toBe("marisol-vega");
  });

  it("accepts any of the field names the client might use", async () => {
    for (const field of CARD_UPLOAD.fieldNames) {
      const response = await post(upload(await cardPng(), field));
      const body = (await response.json()) as { success?: boolean; characterId?: string };
      forget(body.characterId);
      expect(body.success).toBe(true);
    }
  });

  it("refuses a PNG that carries no card", async () => {
    const response = await post(upload(await blankPng()));
    const body = (await response.json()) as { success?: boolean; error?: string };

    expect(response.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/no Tavern character card/i);
  });

  it("refuses a request with no file attached", async () => {
    const response = await post(new FormData());
    expect(response.status).toBe(400);
  });

  it("writes the lorebook the response counts", async () => {
    const response = await post(upload(await cardPng()));
    const body = (await response.json()) as { characterId?: string; loreCount?: number };
    forget(body.characterId);

    const counted = db
      .query<{ total: number }, [string]>(
        "SELECT COUNT(*) as total FROM lorebook_entries WHERE character_id = ?",
      )
      .get(body.characterId ?? "");

    expect(body.loreCount).toBe(2);
    expect(counted?.total).toBe(2);
  });
});

describe("GET /characters/:id/export", () => {
  it("returns a downloadable PNG carrying the card back", async () => {
    const imported = await post(upload(await cardPng()));
    const { characterId } = (await imported.json()) as { characterId?: string };
    forget(characterId);

    const response = await app.request(characterExportPath(characterId ?? ""));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(CARD_UPLOAD.exportContentType);
    expect(response.headers.get("Content-Disposition")).toContain(`${characterId}.png`);

    const png = Buffer.from(new Uint8Array(await response.arrayBuffer()));
    expect(readCardData(readCardJson(png)).name).toBe(V2_CARD.data.name);
  });

  it("answers 404 for a character nobody imported", async () => {
    const response = await app.request(characterExportPath("nobody-at-all"));
    expect(response.status).toBe(404);
  });
});
