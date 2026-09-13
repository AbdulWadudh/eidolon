import { MEDIA_TYPES, type MediaKind } from "@eidolon/config";
import { STORAGE_BROWSER } from "@/config";
import { getStorageConfig, isStorageConnected } from "@/services/storage";
import { listStoredObjects, referencedKeys, type StoredObject } from "@/services/storage-sweep";

export interface BrowsedObject extends StoredObject {
  referenced: boolean;
  url: string;
  kind: MediaKind;
}

export function mediaKindForKey(key: string): MediaKind {
  const path = key.split("?")[0]?.toLowerCase() ?? "";
  if (MEDIA_TYPES.imageExtensions.some((one) => path.endsWith(one))) return "image";
  if (MEDIA_TYPES.audioExtensions.some((one) => path.endsWith(one))) return "audio";
  return "other";
}

export interface BrowseQuery {
  search?: string;
  onlyOrphans?: boolean;
  kind?: MediaKind | null;
  folderMode?: boolean;
  prefix?: string;
  limit?: number;
  offset?: number;
}

export interface BrowsedFolder {
  name: string;
  prefix: string;
  objects: number;
  bytes: number;
  orphans: number;
}

export function normalisePrefix(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/^\/+/, "");
  if (trimmed.length === 0) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function foldersUnder(objects: BrowsedObject[], prefix: string): BrowsedFolder[] {
  const byName = new Map<string, BrowsedFolder>();

  for (const object of objects) {
    if (!object.key.startsWith(prefix)) continue;

    const rest = object.key.slice(prefix.length);
    const cut = rest.indexOf("/");
    if (cut < 0) continue;

    const name = rest.slice(0, cut);
    const held = byName.get(name) ?? {
      name,
      prefix: `${prefix}${name}/`,
      objects: 0,
      bytes: 0,
      orphans: 0,
    };

    held.objects += 1;
    held.bytes += object.bytes;
    if (!object.referenced) held.orphans += 1;
    byName.set(name, held);
  }

  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function filesAt(objects: BrowsedObject[], prefix: string): BrowsedObject[] {
  return objects.filter(
    (object) => object.key.startsWith(prefix) && !object.key.slice(prefix.length).includes("/"),
  );
}

export interface BrowseResult {
  connected: boolean;
  bucket: string;
  publicUrl: string;
  total: number;
  referenced: number;
  orphans: number;
  matched: number;
  bytes: number;
  kinds: Record<MediaKind, number>;
  folderMode: boolean;
  prefix: string;
  folders: BrowsedFolder[];
  limit: number;
  offset: number;
  objects: BrowsedObject[];
}

function bounded(value: number | undefined, fallback: number, most: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) return fallback;
  return Math.min(Math.floor(value), most);
}

export async function browseStorage(query: BrowseQuery = {}): Promise<BrowseResult> {
  const { bucket, publicUrl } = getStorageConfig();
  const base = publicUrl.replace(/\/+$/, "");

  const empty: BrowseResult = {
    connected: false,
    bucket,
    publicUrl: base,
    total: 0,
    referenced: 0,
    orphans: 0,
    matched: 0,
    bytes: 0,
    kinds: { image: 0, audio: 0, other: 0 },
    folderMode: query.folderMode !== false,
    prefix: "",
    folders: [],
    limit: STORAGE_BROWSER.pageSize,
    offset: 0,
    objects: [],
  };

  if (!isStorageConnected()) return empty;

  const stored = await listStoredObjects();
  const keys = referencedKeys(bucket);

  const all: BrowsedObject[] = stored.map((object) => ({
    ...object,
    referenced: keys.has(object.key),
    url: base.length > 0 ? `${base}/${object.key}` : "",
    kind: mediaKindForKey(object.key),
  }));

  const needle = (query.search ?? "").trim().toLowerCase();
  const prefix = normalisePrefix(query.prefix);
  const searching = needle.length > 0;
  const walking = query.folderMode !== false && !searching;

  const filtered = all
    .filter((object) => (query.onlyOrphans ? !object.referenced : true))
    .filter((object) => (query.kind ? object.kind === query.kind : true))
    .filter((object) => (searching ? object.key.toLowerCase().includes(needle) : true))
    .filter((object) => (walking ? object.key.startsWith(prefix) : true));

  const folders = walking ? foldersUnder(filtered, prefix) : [];
  const matched = (walking ? filesAt(filtered, prefix) : filtered).sort(
    (left, right) => right.modifiedAt - left.modifiedAt,
  );

  const limit = bounded(query.limit, STORAGE_BROWSER.pageSize, STORAGE_BROWSER.maxPageSize);
  const offset = bounded(query.offset, 0, Number.MAX_SAFE_INTEGER);

  return {
    connected: true,
    bucket,
    publicUrl: base,
    total: all.length,
    referenced: all.filter((object) => object.referenced).length,
    orphans: all.filter((object) => !object.referenced).length,
    kinds: {
      image: all.filter((object) => object.kind === "image").length,
      audio: all.filter((object) => object.kind === "audio").length,
      other: all.filter((object) => object.kind === "other").length,
    },
    matched: matched.length,
    bytes: matched.reduce((total, object) => total + object.bytes, 0),
    folderMode: walking,
    prefix: walking ? prefix : "",
    folders,
    limit,
    offset,
    objects: matched.slice(offset, offset + limit),
  };
}
