import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
  adminApiPath,
  adminConfigReloadPath,
  SUGGESTIONS as SHIPPED_SUGGESTIONS,
  TTS as SHIPPED_TTS,
} from "@eidolon/config";
import { PAIRING_SECRET } from "@/auth";
import { SUGGESTIONS, TTS } from "@/config";
import { clearAudit } from "@/db/audit";
import { removeOverride, writeOverride } from "@/db/overrides";
import { app } from "@/index";
import { loadConfigOverlay, reloadConfig, setConfigOverride } from "@/services/config";

const count = (): number => SUGGESTIONS.count as number;
const temperature = (): number => SUGGESTIONS.temperature as number;
const speed = (): number => TTS.speed as number;

const OWNER = { "Content-Type": "application/json", Authorization: `Bearer ${PAIRING_SECRET}` };
const TOUCHED = ["SUGGESTIONS.count", "SUGGESTIONS.temperature", "TTS.speed", "TTS.voice"];

function scrub(): void {
  for (const path of TOUCHED) removeOverride(path);
  loadConfigOverlay();
  clearAudit();
}

beforeAll(scrub);
afterEach(scrub);
afterAll(scrub);

describe("the config overlay", () => {
  it("reads the shipped default when nothing is overridden", () => {
    expect(count()).toBe(SHIPPED_SUGGESTIONS.count);
    expect(speed()).toBe(SHIPPED_TTS.speed);
  });

  it("takes effect on a live consumer without restarting the process", () => {
    const shipped = SHIPPED_SUGGESTIONS.count;
    const wanted = shipped + 4;

    const outcome = setConfigOverride("SUGGESTIONS.count", wanted);

    expect(outcome.ok).toBe(true);
    expect(count()).toBe(wanted);
    expect(temperature()).toBe(SHIPPED_SUGGESTIONS.temperature);
    expect(SHIPPED_SUGGESTIONS.count).toBe(shipped);
  });

  it("re-reads the database on reloadConfig, picking up a write it did not make", () => {
    writeOverride("TTS.speed", 1.75);
    expect(speed()).toBe(SHIPPED_TTS.speed);

    const report = reloadConfig();

    expect(speed()).toBe(1.75);
    expect(report.applied).toBeGreaterThan(0);
  });

  it("drops an override again when it is cleared", () => {
    setConfigOverride("SUGGESTIONS.count", 9);
    expect(count()).toBe(9);

    removeOverride("SUGGESTIONS.count");
    reloadConfig();

    expect(count()).toBe(SHIPPED_SUGGESTIONS.count);
  });

  it("still spreads and enumerates like the object it stands in for", () => {
    setConfigOverride("SUGGESTIONS.count", 7);
    const copy = { ...SUGGESTIONS } as { count: number };

    expect(copy.count).toBe(7);
    expect(Object.keys(SUGGESTIONS).sort()).toEqual(Object.keys(SHIPPED_SUGGESTIONS).sort());
  });

  it("refuses an override on a key that is not editable", () => {
    const serviceBound = setConfigOverride("TTS.voice", "af_nova");
    const structural = setConfigOverride("API_ROUTES.health", "/nope");
    const bootBound = setConfigOverride("UI_MS.reveal", 10);

    expect(serviceBound.ok).toBe(false);
    expect(structural.ok).toBe(false);
    expect(bootBound.ok).toBe(false);
    expect(serviceBound.ok === false && serviceBound.status).toBe(403);
    expect(TTS.voice).toBe(SHIPPED_TTS.voice);
  });

  it("refuses an override of the wrong type", () => {
    const outcome = setConfigOverride("SUGGESTIONS.count", "three");

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.status).toBe(400);
    expect(count()).toBe(SHIPPED_SUGGESTIONS.count);
  });

  it("refuses a path it has never heard of", () => {
    const outcome = setConfigOverride("NOT_A_GROUP.nope", 1);

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.status).toBe(404);
  });

  it("ignores a non-editable row already sitting in the table", () => {
    writeOverride("TTS.voice", "af_nova");
    const report = loadConfigOverlay();

    expect(report.ignored).toContain("TTS.voice");
    expect(TTS.voice).toBe(SHIPPED_TTS.voice);
  });
});

describe("the config route", () => {
  it("reports every setting with its bucket and reason", async () => {
    const response = await app.request(adminApiPath("config"), { headers: OWNER });
    const body = (await response.json()) as {
      settings: { path: string; bucket: string; reason: string }[];
      buckets: { bucket: string; count: number }[];
    };

    expect(response.status).toBe(200);
    expect(body.settings.length).toBeGreaterThan(500);
    for (const bucket of body.buckets) expect(bucket.count).toBeGreaterThan(0);
    for (const setting of body.settings) expect(setting.reason.length).toBeGreaterThan(0);
  });

  it("never puts a secret's value on the wire", async () => {
    const response = await app.request(adminApiPath("config"), { headers: OWNER });
    const body = (await response.json()) as {
      settings: { path: string; secret: boolean; value: unknown; shipped: unknown }[];
    };

    const secrets = body.settings.filter((entry) => entry.secret);
    expect(secrets.length).toBeGreaterThan(0);

    for (const entry of secrets) {
      expect(typeof entry.value).toBe("boolean");
      expect(typeof entry.shipped).toBe("boolean");
    }
  });

  it("writes an editable setting and reads it back changed", async () => {
    const response = await app.request(adminApiPath("config", "SUGGESTIONS.count"), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: 6 }),
    });
    const body = (await response.json()) as {
      setting: { value: unknown; isOverridden: boolean; shipped: unknown };
    };

    expect(response.status).toBe(200);
    expect(body.setting.value).toBe(6);
    expect(body.setting.isOverridden).toBe(true);
    expect(body.setting.shipped).toBe(SHIPPED_SUGGESTIONS.count);
    expect(count()).toBe(6);
  });

  it("answers 403 with the bucket's reason on a non-editable key", async () => {
    const response = await app.request(adminApiPath("config", "TTS.voice"), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: "af_nova" }),
    });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toContain("Kokoro");
  });

  it("answers 404 on a path it does not know", async () => {
    const response = await app.request(adminApiPath("config", "NOPE.nope"), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: 1 }),
    });

    expect(response.status).toBe(404);
  });

  it("clears an override through the route", async () => {
    await app.request(adminApiPath("config", "SUGGESTIONS.count"), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: 8 }),
    });
    expect(count()).toBe(8);

    const response = await app.request(adminApiPath("config", "SUGGESTIONS.count"), {
      method: "DELETE",
      headers: OWNER,
    });
    const body = (await response.json()) as { setting: { isOverridden: boolean } };

    expect(response.status).toBe(200);
    expect(body.setting.isOverridden).toBe(false);
    expect(count()).toBe(SHIPPED_SUGGESTIONS.count);
  });

  it("applies a write made behind its back when reload is asked for", async () => {
    writeOverride("SUGGESTIONS.temperature", 0.42);
    expect(temperature()).toBe(SHIPPED_SUGGESTIONS.temperature);

    const response = await app.request(adminConfigReloadPath(), { method: "POST", headers: OWNER });
    const body = (await response.json()) as { generation: number; applied: number };

    expect(response.status).toBe(200);
    expect(body.generation).toBeGreaterThan(0);
    expect(temperature()).toBe(0.42);
  });

  it("is closed to anyone without an owner credential", async () => {
    const anonymous = await app.request(adminApiPath("config"));
    const reload = await app.request(adminConfigReloadPath(), { method: "POST" });

    expect(anonymous.status).toBe(401);
    expect(reload.status).toBe(401);
  });
});
