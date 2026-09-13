export const CONFIG_BUCKETS = [
  "editable",
  "service-bound",
  "deployment",
  "boot-bound",
  "structural",
] as const;

export type ConfigBucket = (typeof CONFIG_BUCKETS)[number];

export const BUCKET_COPY: Record<ConfigBucket, { label: string; blurb: string }> = {
  editable: {
    label: "Editable",
    blurb: "Safe to change while the conductor is running. Takes effect on reload.",
  },
  "service-bound": {
    label: "Set by a service",
    blurb: "Decided by something running elsewhere. Change it there, not here.",
  },
  deployment: {
    label: "Set by the host",
    blurb: "Comes from the environment the conductor was started in.",
  },
  "boot-bound": {
    label: "Read once at start",
    blurb: "The right value, but nothing re-reads it while the process is up.",
  },
  structural: {
    label: "Structural",
    blurb: "A contract rather than a setting. A wrong value breaks the shape, not the behaviour.",
  },
};

export type ConfigValueKind = "string" | "number" | "boolean" | "list" | "object";

export interface LeafSpec {
  bucket?: ConfigBucket;
  reason?: string;
  boundTo?: string;
}

export interface ConfigGroup {
  name: string;
  source: string;
  value: unknown;
  bucket: ConfigBucket;
  reason: string;
  boundTo?: string;
  secret?: boolean;
  leaves?: Record<string, LeafSpec>;
}

export interface ConfigEntry {
  path: string;
  group: string;
  source: string;
  bucket: ConfigBucket;
  reason: string;
  boundTo: string | null;
  kind: ConfigValueKind;
  secret: boolean;
  shipped: unknown;
}

export function kindOf(value: unknown): ConfigValueKind {
  if (Array.isArray(value)) return "list";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  return "object";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function entriesFor(group: ConfigGroup): ConfigEntry[] {
  const base = {
    group: group.name,
    source: group.source,
    secret: group.secret ?? false,
  };

  if (!isPlainRecord(group.value)) {
    return [
      {
        ...base,
        path: group.name,
        bucket: group.bucket,
        reason: group.reason,
        boundTo: group.boundTo ?? null,
        kind: kindOf(group.value),
        shipped: group.value,
      },
    ];
  }

  return Object.entries(group.value)
    .filter(([, value]) => typeof value !== "function")
    .map(([leaf, value]) => {
      const spec = group.leaves?.[leaf];
      return {
        ...base,
        path: `${group.name}.${leaf}`,
        bucket: spec?.bucket ?? group.bucket,
        reason: spec?.reason ?? group.reason,
        boundTo: spec?.boundTo ?? group.boundTo ?? null,
        kind: kindOf(value),
        shipped: value,
      };
    });
}
