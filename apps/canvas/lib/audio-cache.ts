import { CALL } from "@eidolon/config";

interface WritableFile {
  uri: string;
  create: (options: { overwrite: boolean }) => void;
  write: (content: string, options: { encoding: "base64" }) => void;
}

interface ReadableFile {
  exists: boolean;
  base64: () => Promise<string>;
}

interface CacheDirectory {
  exists: boolean;
  create: (options: { intermediates: boolean }) => void;
  delete: () => void;
}

interface FileSystemModule {
  Paths: { cache: unknown };
  Directory: new (parent: unknown, name: string) => CacheDirectory;
  File: (new (parent: unknown, name: string) => WritableFile) & (new (uri: string) => ReadableFile);
}

let cached: FileSystemModule | null | undefined;

function loadFileSystem(): FileSystemModule | null {
  if (cached !== undefined) return cached;

  try {
    cached = require("expo-file-system") as FileSystemModule;
  } catch {
    cached = null;
  }

  return cached;
}

export function cacheSpokenSentence(key: string, base64: string): string | null {
  if (base64.length === 0) return null;

  const fs = loadFileSystem();
  if (!fs) return null;

  try {
    const directory = new fs.Directory(fs.Paths.cache, CALL.cacheDirectory);
    if (!directory.exists) directory.create({ intermediates: true });

    const target = new fs.File(directory, `${key}.mp3`);
    target.create({ overwrite: true });
    target.write(base64, { encoding: "base64" });
    return target.uri;
  } catch (error) {
    console.error("[call] could not cache a spoken sentence", error);
    return null;
  }
}

export function clearSpokenSentences(): void {
  const fs = loadFileSystem();
  if (!fs) return;

  try {
    const directory = new fs.Directory(fs.Paths.cache, CALL.cacheDirectory);
    if (directory.exists) directory.delete();
  } catch (error) {
    console.error("[call] could not clear the spoken sentence cache", error);
  }
}

export async function readAudioAsBase64(uri: string): Promise<string | null> {
  const fs = loadFileSystem();
  if (!fs) return null;

  try {
    const file = new fs.File(uri);
    if (!file.exists) return null;
    return await file.base64();
  } catch (error) {
    console.error("[call] could not read the recording back", error);
    return null;
  }
}

export function inlineAudioUri(base64: string): string {
  return base64.length > 0 ? `data:audio/mpeg;base64,${base64}` : "";
}
