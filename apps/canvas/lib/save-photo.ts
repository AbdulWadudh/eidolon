import { Directory, File, Paths } from "expo-file-system";

export type SaveResult = "saved" | "denied" | "unavailable" | "failed";

type MediaLibraryModule = typeof import("expo-media-library");

// expo-media-library links native code. Importing it at module scope throws
// "Cannot find native module 'ExpoMediaLibraryNext'" on a client built before it
// was added, and this module is reached from the chat route, so that throw took
// the whole route down with it. Loading it at the point of use fixes that.
//
// The import still resolves on such a client — Expo logs the missing native
// module and leaves the exports undefined rather than rejecting — so the
// functions have to be checked before they are called. A try/catch alone gets
// "undefined is not a function" instead.
async function loadMediaLibrary(): Promise<MediaLibraryModule | null> {
  try {
    const module = await import("expo-media-library");
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
