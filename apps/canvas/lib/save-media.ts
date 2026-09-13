import { DATA_FILES } from "@eidolon/config";
import { Directory, File, Paths } from "expo-file-system";
import { filenameOf, mediaKindFor } from "@/lib/media-kind";
import { type SaveResult, savePhotoToDevice } from "@/lib/save-photo";

export type SaveTarget = "gallery" | "file";

export interface SaveOutcome {
  result: SaveResult;
  target: SaveTarget;
  name: string;
}

function safeName(url: string): string {
  const name = filenameOf(url).replace(/[^a-z0-9._-]+/gi, "-");
  return name.length > 0 ? name : `eidolon-${Date.now()}`;
}

async function downloadToFiles(url: string): Promise<SaveOutcome> {
  const name = safeName(url);

  try {
    const folder = new Directory(Paths.document, DATA_FILES.directoryName);
    if (!folder.exists) folder.create({ intermediates: true });

    const response = await fetch(url);
    if (!response.ok) return { result: "failed", target: "file", name };

    const target = new File(folder, name);
    target.create({ overwrite: true });
    target.write(new Uint8Array(await response.arrayBuffer()));

    return { result: "saved", target: "file", name };
  } catch (error) {
    console.error("[save-media]", error);
    return { result: "failed", target: "file", name };
  }
}

export async function saveMediaToDevice(url: string): Promise<SaveOutcome> {
  const name = safeName(url);

  if (mediaKindFor(url) === "image") {
    const result = await savePhotoToDevice(url);
    if (result === "saved" || result === "denied") return { result, target: "gallery", name };
  }

  return downloadToFiles(url);
}
