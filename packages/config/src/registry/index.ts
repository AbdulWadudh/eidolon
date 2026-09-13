import { INTERFACE_GROUPS } from "./interface";
import { MEDIA_GROUPS } from "./media";
import { PROMPTING_GROUPS } from "./prompting";
import { RUNTIME_GROUPS } from "./runtime";
import { SYSTEM_GROUPS } from "./system";
import { type ConfigBucket, type ConfigEntry, type ConfigGroup, entriesFor } from "./types";

export { REASONS } from "./reasons";
export {
  BUCKET_COPY,
  CONFIG_BUCKETS,
  type ConfigBucket,
  type ConfigEntry,
  type ConfigGroup,
  type ConfigValueKind,
  kindOf,
  type LeafSpec,
} from "./types";

export const CONFIG_GROUPS: ConfigGroup[] = [
  ...RUNTIME_GROUPS,
  ...PROMPTING_GROUPS,
  ...MEDIA_GROUPS,
  ...INTERFACE_GROUPS,
  ...SYSTEM_GROUPS,
];

export const CONFIG_ENTRIES: ConfigEntry[] = CONFIG_GROUPS.flatMap(entriesFor);

const BY_PATH = new Map(CONFIG_ENTRIES.map((entry) => [entry.path, entry]));

export function configEntry(path: string): ConfigEntry | null {
  return BY_PATH.get(path) ?? null;
}

export function isEditablePath(path: string): boolean {
  return configEntry(path)?.bucket === "editable";
}

export function entriesInBucket(bucket: ConfigBucket): ConfigEntry[] {
  return CONFIG_ENTRIES.filter((entry) => entry.bucket === bucket);
}

export function classifiedGroupNames(): string[] {
  return CONFIG_GROUPS.map((group) => group.name);
}
