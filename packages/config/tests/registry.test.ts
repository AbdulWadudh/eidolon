import { describe, expect, it } from "bun:test";
import * as CONFIG from "../src/index";
import {
  CONFIG_BUCKETS,
  CONFIG_ENTRIES,
  classifiedGroupNames,
  configEntry,
  isEditablePath,
} from "../src/registry";

const SYNTHETIC_GROUPS = ["ENVIRONMENT", "SECRETS"];

function exportedValueNames(): string[] {
  return Object.entries(CONFIG)
    .filter(([, value]) => typeof value !== "function")
    .map(([name]) => name);
}

describe("the config registry", () => {
  it("classifies every value exported from @eidolon/config", () => {
    const classified = new Set(classifiedGroupNames());
    const unclassified = exportedValueNames().filter((name) => !classified.has(name));

    expect(unclassified).toEqual([]);
  });

  it("claims no group that the package does not export", () => {
    const exported = new Set([...exportedValueNames(), ...SYNTHETIC_GROUPS]);
    const phantom = classifiedGroupNames().filter((name) => !exported.has(name));

    expect(phantom).toEqual([]);
  });

  it("puts every leaf in exactly one known bucket, with a reason", () => {
    const seen = new Set<string>();

    for (const entry of CONFIG_ENTRIES) {
      expect(CONFIG_BUCKETS).toContain(entry.bucket);
      expect(entry.reason.length).toBeGreaterThan(0);
      expect(seen.has(entry.path)).toBe(false);
      seen.add(entry.path);
    }

    expect(seen.size).toBe(CONFIG_ENTRIES.length);
  });

  it("names the service behind everything it calls service-bound", () => {
    for (const entry of CONFIG_ENTRIES.filter((one) => one.bucket === "service-bound")) {
      expect(entry.boundTo).not.toBeNull();
    }
  });

  it("never sends a secret's value, only whether it is set", () => {
    for (const entry of CONFIG_ENTRIES.filter((one) => one.secret)) {
      expect(entry.kind).toBe("boolean");
      expect(typeof entry.shipped).toBe("boolean");
    }
  });

  it("treats only editable leaves as overridable", () => {
    expect(isEditablePath("SUGGESTIONS.count")).toBe(true);
    expect(isEditablePath("MEMORY.searchLimit")).toBe(true);

    expect(isEditablePath("MEMORY.embeddingDimensions")).toBe(false);
    expect(isEditablePath("TTS.voice")).toBe(false);
    expect(isEditablePath("AFFINITY.max")).toBe(false);
    expect(isEditablePath("UI_MS.reveal")).toBe(false);
    expect(isEditablePath("API_ROUTES.health")).toBe(false);
    expect(isEditablePath("SECRETS.PAIRING_SECRET")).toBe(false);
    expect(isEditablePath("not.a.path")).toBe(false);
  });

  it("carries the shipped value alongside each entry", () => {
    expect(configEntry("SUGGESTIONS.count")?.shipped).toBe(CONFIG.SUGGESTIONS.count);
    expect(configEntry("AFFINITY.maxDeltaPerTurn")?.shipped).toBe(CONFIG.AFFINITY.maxDeltaPerTurn);
  });

  it("has at least one leaf in every bucket", () => {
    for (const bucket of CONFIG_BUCKETS) {
      const inBucket = CONFIG_ENTRIES.filter((entry) => entry.bucket === bucket);
      expect(inBucket.length).toBeGreaterThan(0);
    }
  });
});
