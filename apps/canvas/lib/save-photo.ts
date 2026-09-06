import { Directory, File, Paths } from "expo-file-system";

export type SaveResult = "saved" | "denied" | "unavailable" | "failed";

type MediaLibraryModule = typeof import("expo-media-library/legacy");

// Deliberately the /legacy entry, not the package root. The root is the new
// "Next" API: it imports ExpoMediaLibraryNext at module scope and builds classes
// out of it, so on any client without that native module — Expo Go, or a dev
// client built before this dependency was added — the import throws. Because
// this module is reached from the chat route, that throw took the whole route
// down with it.
//
// /legacy is backed by the older ExpoMediaLibrary native module, which Expo Go
// does ship, and exposes the same two functions. Loading it at the point of use
// rather than at module scope keeps a client without either one running, and
// the exports are checked because a missing native module leaves them undefined
// rather than rejecting the import.
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
