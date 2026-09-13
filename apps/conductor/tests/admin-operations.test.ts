import { afterAll, describe, expect, it } from "bun:test";
import {
  AUTH_ROUTES,
  adminApiPath,
  adminQueueJobPath,
  adminStorageSweepPath,
} from "@eidolon/config";
import { PAIRING_SECRET } from "@/auth";
import { deleteAccount } from "@/auth/roles";
import { clearAudit, listAudit } from "@/db/audit";
import { app } from "@/index";
import { QUEUE_STATES, queueFor } from "@/queue/stats";

const OWNER = { "Content-Type": "application/json", Authorization: `Bearer ${PAIRING_SECRET}` };
const MEMBER_EMAIL = "operations-test-member@eidolon.test";
const MEMBER_PASSWORD = "operations-test-password";
const made = new Set<string>();

async function memberHeaders(): Promise<Record<string, string>> {
  const attempt = (path: string, body: Record<string, string>) =>
    app.request(`${AUTH_ROUTES.base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const created = await attempt("/sign-up/email", {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    name: "Operations Test",
  });
  const source = created.ok
    ? created
    : await attempt("/sign-in/email", { email: MEMBER_EMAIL, password: MEMBER_PASSWORD });

  const body = (await source.json()) as { token?: string; user?: { id?: string } };
  if (body.user?.id) made.add(body.user.id);
  return { "Content-Type": "application/json", Authorization: `Bearer ${body.token ?? ""}` };
}

afterAll(() => {
  for (const id of made) deleteAccount(id);
  made.clear();
  clearAudit();
});

describe("the storage surface", () => {
  it("reports without deleting when only read", async () => {
    const response = await app.request(adminApiPath("storage"), { headers: OWNER });
    const body = (await response.json()) as {
      connected: boolean;
      removed: string[];
      freedBytes: number;
      orphans: unknown[];
    };

    expect(response.status).toBe(200);
    expect(body.removed).toEqual([]);
    expect(body.freedBytes).toBe(0);
    expect(Array.isArray(body.orphans)).toBe(true);
  });

  it("reports the bucket as offline here rather than pretending it swept", async () => {
    const response = await app.request(adminApiPath("storage"), { headers: OWNER });
    const body = (await response.json()) as { connected: boolean; skipped: string | null };

    expect(body.connected).toBe(false);
    expect(body.skipped).toBe("not-connected");
  });

  it("records a sweep in the audit trail, with what it did", async () => {
    clearAudit();
    const response = await app.request(adminStorageSweepPath(), { method: "POST", headers: OWNER });

    expect(response.status).toBe(200);

    const entries = listAudit(5);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.path).toContain("/storage/sweep");
    expect(entries[0]?.detail).toContain("[Storage]");
  });

  it("is closed to a member", async () => {
    const headers = await memberHeaders();

    const read = await app.request(adminApiPath("storage"), { headers });
    const swept = await app.request(adminStorageSweepPath(), { method: "POST", headers });

    expect(read.status).toBe(403);
    expect(swept.status).toBe(403);
  });
});

describe("the queue surface", () => {
  it("names every queue and counts every state, reachable or not", async () => {
    const response = await app.request(adminApiPath("queues"), { headers: OWNER });
    const body = (await response.json()) as {
      queues: {
        key: string;
        name: string;
        reachable: boolean;
        counts: Record<string, number>;
        jobs: unknown[];
      }[];
    };

    expect(response.status).toBe(200);
    expect(body.queues.map((queue) => queue.key).sort()).toEqual(["gpu", "proactive", "s3Upload"]);

    for (const queue of body.queues) {
      expect(queue.name.length).toBeGreaterThan(0);
      for (const state of QUEUE_STATES) {
        expect(typeof queue.counts[state]).toBe("number");
      }
      expect(Array.isArray(queue.jobs)).toBe(true);
    }
  });

  it("survives Redis being unreachable instead of failing the request", async () => {
    const response = await app.request(adminApiPath("queues"), { headers: OWNER });
    expect(response.status).toBe(200);
  });

  it("answers 404 for a queue it does not have", async () => {
    const retried = await app.request(`${adminApiPath("queues", "nope")}/retry`, {
      method: "POST",
      headers: OWNER,
    });
    const removed = await app.request(adminQueueJobPath("nope", "1"), {
      method: "DELETE",
      headers: OWNER,
    });

    expect(retried.status).toBe(404);
    expect(removed.status).toBe(404);
  });

  it("knows the three queues by key", () => {
    expect(queueFor("gpu")).not.toBeNull();
    expect(queueFor("s3Upload")).not.toBeNull();
    expect(queueFor("proactive")).not.toBeNull();
    expect(queueFor("imaginary")).toBeNull();
  });

  it("is closed to a member", async () => {
    const headers = await memberHeaders();
    const response = await app.request(adminApiPath("queues"), { headers });
    expect(response.status).toBe(403);
  });
});

describe("the health surface", () => {
  it("reports every service the conductor depends on", async () => {
    const response = await app.request(adminApiPath("health"), { headers: OWNER });
    const body = (await response.json()) as {
      status: string;
      services: Record<string, string>;
      storage: { status: string };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(Object.keys(body.services).sort()).toEqual([
      "cache",
      "comfyui",
      "lancedb",
      "llm",
      "sqlite",
      "stt",
      "tts",
    ]);
    expect(body.storage.status).toBeString();
  });

  it("is closed to a member, unlike the public health route", async () => {
    const headers = await memberHeaders();

    const gated = await app.request(adminApiPath("health"), { headers });
    const anonymous = await app.request(adminApiPath("health"));

    expect(gated.status).toBe(403);
    expect(anonymous.status).toBe(401);
  });
});
