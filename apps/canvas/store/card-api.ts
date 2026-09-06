import { CARD_UPLOAD, characterImportUrl, TIMEOUTS_MS } from "@eidolon/config";

export interface ImportedCharacter {
  characterId: string;
  loreCount: number;
  anchorUrl: string | null;
}

export interface CardPick {
  uri: string;
  name: string;
}

export type ImportResult =
  | { ok: true; character: ImportedCharacter }
  | { ok: false; error: string };

interface ImportBody {
  success?: unknown;
  characterId?: unknown;
  loreCount?: unknown;
  anchorUrl?: unknown;
  error?: unknown;
}

function fileField(pick: CardPick): FormData {
  const body = new FormData();
  const field = CARD_UPLOAD.fieldNames[0] ?? "card";

  body.append(field, {
    uri: pick.uri,
    name: pick.name,
    type: CARD_UPLOAD.exportContentType,
  } as unknown as Blob);

  return body;
}

export async function importTavernCard(host: string, pick: CardPick): Promise<ImportResult> {
  if (!host) return { ok: false, error: "" };

  try {
    const response = await fetch(characterImportUrl(host), {
      method: "POST",
      body: fileField(pick),
      signal: AbortSignal.timeout(TIMEOUTS_MS.transcript),
    });

    const body = (await response.json().catch(() => ({}))) as ImportBody;

    if (!response.ok || body.success !== true || typeof body.characterId !== "string") {
      return { ok: false, error: typeof body.error === "string" ? body.error : "" };
    }

    return {
      ok: true,
      character: {
        characterId: body.characterId,
        loreCount: typeof body.loreCount === "number" ? body.loreCount : 0,
        anchorUrl: typeof body.anchorUrl === "string" ? body.anchorUrl : null,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "" };
  }
}
