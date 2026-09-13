import { CONFIG_ENTRIES, type ConfigEntry, configEntry, kindOf } from "@eidolon/config/registry";
import {
  listOverrides,
  readOverride,
  removeOverride,
  type StoredOverride,
  writeOverride,
} from "@/db/overrides";
import {
  applyOverlay,
  overlayGeneration,
  overlaySize,
  overlayValue,
} from "@/services/config-overlay";

export { overlayEntries, resolvedGroup } from "@/services/config-overlay";

export interface OverlayReport {
  generation: number;
  applied: number;
  ignored: string[];
}

function acceptable(entry: ConfigEntry, value: unknown): boolean {
  return kindOf(value) === entry.kind;
}

export function loadConfigOverlay(): OverlayReport {
  const next = new Map<string, unknown>();
  const ignored: string[] = [];

  for (const stored of listOverrides()) {
    const entry = configEntry(stored.path);
    if (entry?.bucket !== "editable" || !acceptable(entry, stored.value)) {
      ignored.push(stored.path);
      continue;
    }
    next.set(stored.path, stored.value);
  }

  const generation = applyOverlay(next);
  return { generation, applied: overlaySize(), ignored };
}

export function reloadConfig(): OverlayReport {
  return loadConfigOverlay();
}

export function configGeneration(): number {
  return overlayGeneration();
}

export type OverrideOutcome =
  | { ok: true; override: StoredOverride; entry: ConfigEntry }
  | { ok: false; status: 404 | 403 | 400; error: string };

export function setConfigOverride(path: string, value: unknown): OverrideOutcome {
  const entry = configEntry(path);
  if (!entry) return { ok: false, status: 404, error: "No such setting." };

  if (entry.bucket !== "editable") {
    return { ok: false, status: 403, error: entry.reason };
  }

  if (!acceptable(entry, value)) {
    return {
      ok: false,
      status: 400,
      error: `This setting holds a ${entry.kind}, not a ${kindOf(value)}.`,
    };
  }

  const override = writeOverride(path, value);
  loadConfigOverlay();
  return { ok: true, override, entry };
}

export function clearConfigOverride(path: string): OverrideOutcome {
  const entry = configEntry(path);
  if (!entry) return { ok: false, status: 404, error: "No such setting." };

  const existing = readOverride(path);
  if (!existing) return { ok: false, status: 404, error: "That setting is not overridden." };

  removeOverride(path);
  loadConfigOverlay();
  return { ok: true, override: { ...existing, value: entry.shipped }, entry };
}

export interface ConfigView extends ConfigEntry {
  value: unknown;
  isOverridden: boolean;
}

export function describeConfig(): ConfigView[] {
  return CONFIG_ENTRIES.map((entry) => {
    const override = overlayValue(entry.path);
    return {
      ...entry,
      value: override === undefined ? entry.shipped : override,
      isOverridden: override !== undefined,
    };
  });
}
