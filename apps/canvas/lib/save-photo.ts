import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export type SaveResult = "saved" | "denied" | "failed";

function extensionFor(uri: string): string {
  const match = /\.(png|jpe?g|webp)(?:\?|$)/i.exec(uri);
  return match ? match[1].toLowerCase() : "png";
}

export async function savePhotoToDevice(uri: string): Promise<SaveResult> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return "denied";

    const target = new File(Paths.cache, `eidolon-${Date.now()}.${extensionFor(uri)}`);
    const cache = new Directory(Paths.cache);
    if (!cache.exists) cache.create({ intermediates: true });

    const response = await fetch(uri);
    if (!response.ok) return "failed";

    target.create({ overwrite: true });
    target.write(new Uint8Array(await response.arrayBuffer()));

    await MediaLibrary.saveToLibraryAsync(target.uri);
    target.delete();
    return "saved";
  } catch (error) {
    console.error("[save-photo]", error);
    return "failed";
  }
}
