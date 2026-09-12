import { Directory, File, Paths } from "expo-file-system";

export type SaveResult = "saved" | "denied" | "unavailable" | "failed";

type MediaLibraryModule = typeof import("expo-media-library/legacy");

async function loadMediaLibrary(): Promise<MediaLibraryModule | null> {
  try {
    const module = await import("expo-media-library/legacy");
    const usable =
      typeof module?.requestPermissionsAsync === "function" &&
      typeof module?.saveToLibraryAsync === "function";
    return usable ? module : null;
  } catch {
    return null;
  }
}

function extensionFor(uri: string): string {
  const match = /\.(png|jpe?g|webp)(?:\?|$)/i.exec(uri);
  return match ? match[1].toLowerCase() : "png";
}

export async function savePhotoToDevice(uri: string): Promise<SaveResult> {
  const mediaLibrary = await loadMediaLibrary();
  if (!mediaLibrary) return "unavailable";

  try {
    const permission = await mediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return "denied";

    const target = new File(Paths.cache, `eidolon-${Date.now()}.${extensionFor(uri)}`);
    const cache = new Directory(Paths.cache);
    if (!cache.exists) cache.create({ intermediates: true });

    const response = await fetch(uri);
    if (!response.ok) return "failed";

    target.create({ overwrite: true });
    target.write(new Uint8Array(await response.arrayBuffer()));

    await mediaLibrary.saveToLibraryAsync(target.uri);
    target.delete();
    return "saved";
  } catch (error) {
    console.error("[save-photo]", error);
    return "failed";
  }
}
