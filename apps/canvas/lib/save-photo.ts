import { Directory, File, Paths } from "expo-file-system";

export type SaveResult = "saved" | "denied" | "unavailable" | "failed";

// expo-media-library links native code. Importing it at module scope throws
// "Cannot find native module 'ExpoMediaLibraryNext'" on a client built before it
// was added — and because this module is reached from the chat route, that
// throw takes the whole route down with it. Loading it at the point of use
// keeps a stale client running and turns the failure into one disabled button.
async function loadMediaLibrary(): Promise<typeof import("expo-media-library") | null> {
  try {
    return await import("expo-media-library");
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
