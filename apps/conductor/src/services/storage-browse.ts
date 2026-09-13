import { STORAGE_BROWSER } from "@/config";
import { getStorageConfig, isStorageConnected } from "@/services/storage";
import { listStoredObjects, referencedKeys, type StoredObject } from "@/services/storage-sweep";

export interface BrowsedObject extends StoredObject {
  referenced: boolean;
  url: string;
}

export interface BrowseQuery {
  search?: string;
  onlyOrphans?: boolean;
  limit?: number;
  offset?: number;
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
  }));

  const needle = (query.search ?? "").trim().toLowerCase();
  const matched = all
    .filter((object) => (query.onlyOrphans ? !object.referenced : true))
    .filter((object) => (needle.length === 0 ? true : object.key.toLowerCase().includes(needle)))
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  const limit = bounded(query.limit, STORAGE_BROWSER.pageSize, STORAGE_BROWSER.maxPageSize);
  const offset = bounded(query.offset, 0, Number.MAX_SAFE_INTEGER);

  return {
    connected: true,
    bucket,
    publicUrl: base,
    total: all.length,
    referenced: all.filter((object) => object.referenced).length,
    orphans: all.filter((object) => !object.referenced).length,
    matched: matched.length,
    bytes: matched.reduce((total, object) => total + object.bytes, 0),
    limit,
    offset,
    objects: matched.slice(offset, offset + limit),
  };
}
