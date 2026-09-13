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
import {
  describeInput,
  describeOutput,
  describeValue,
  QUEUE_STATES,
  queueFor,
} from "@/queue/stats";
import { isAuthorableField, shapeJobPrompt } from "@/services/job-author";

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

describe("what a queued job is allowed to show", () => {
  it("never puts a base64 payload on the wire", () => {
    const fields = describeInput({
      characterId: "emma",
      filename: "portrait.webp",
      bufferBase64: "A".repeat(50_000),
    });

    const buffer = fields.find((field) => field.label === "bufferBase64");
    expect(buffer?.value).toBe("50000 chars, not shown");
    expect(buffer?.value).not.toContain("AAAA");
  });

  it("redacts anything named like a credential", () => {
    for (const key of ["secret", "apiKey", "accessToken", "userPassword"]) {
      expect(describeValue(key, "hunter2")).toBe("7 chars, not shown");
    }
  });

  it("truncates a long prompt rather than dropping or streaming it", () => {
    const value = describeValue("prompt", "x".repeat(500));

    expect(value).toContain("(500 chars)");
    expect(value.length).toBeLessThan(300);
  });

  it("keeps a short field exactly as it is", () => {
    expect(describeValue("characterId", "emma")).toBe("emma");
    expect(describeValue("chapterIndex", 3)).toBe("3");
  });

  it("counts an array instead of listing it", () => {
    expect(describeValue("messageBatch", ["a", "b", "c"])).toBe("3 items");
  });

  it("reports no output as null rather than the string undefined", () => {
    expect(describeOutput(undefined)).toBeNull();
    expect(describeOutput(null)).toBeNull();
    expect(describeOutput("https://storage/x.webp")).toBe("https://storage/x.webp");
  });
});

describe("editing a failed job", () => {
  it("marks a plain field editable and a redacted one not", () => {
    const fields = describeInput({
      prompt: "a portrait",
      characterId: "emma",
      bufferBase64: "A".repeat(100),
      messageBatch: ["a", "b"],
    });

    const by = (label: string) => fields.find((field) => field.label === label);

    expect(by("prompt")?.editable).toBe(true);
    expect(by("characterId")?.editable).toBe(true);
    expect(by("bufferBase64")?.editable).toBe(false);
    expect(by("messageBatch")?.editable).toBe(false);
  });

  it("refuses to call a truncated field editable, so a save cannot shorten it", () => {
    const fields = describeInput({ prompt: "x".repeat(500) });
    expect(fields[0]?.editable).toBe(false);
  });

  it("answers 404 for a job or queue it does not have", async () => {
    const missing = await app.request(adminQueueJobPath("gpu", "no-such-job"), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ data: { prompt: "x" } }),
    });
    const wrongQueue = await app.request(adminQueueJobPath("nope", "1"), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ data: { prompt: "x" } }),
    });

    expect(missing.status).toBe(404);
    expect(wrongQueue.status).toBe(404);
  });

  it("refuses a body that is not a data patch", async () => {
    const response = await app.request(adminQueueJobPath("gpu", "1"), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ nope: true }),
    });

    expect(response.status).toBe(400);
  });

  it("is closed to a member", async () => {
    const headers = await memberHeaders();
    const response = await app.request(adminQueueJobPath("gpu", "1"), {
      method: "PATCH",
      headers,
      body: JSON.stringify({ data: { prompt: "x" } }),
    });

    expect(response.status).toBe(403);
  });
});

describe("writing a job prompt for you", () => {
  it("offers itself only on a prompt field", () => {
    expect(isAuthorableField("prompt")).toBe(true);
    expect(isAuthorableField("contextPrompt")).toBe(true);
    expect(isAuthorableField("characterId")).toBe(false);
    expect(isAuthorableField("filename")).toBe(false);
  });

  it("takes one line out of whatever the model wrapped it in", () => {
    const nl = String.fromCharCode(10);

    expect(shapeJobPrompt(`\`\`\`${nl}red hair, soft light${nl}\`\`\``)).toBe(
      "red hair, soft light",
    );
    expect(shapeJobPrompt("Prompt: red hair, soft light")).toBe("red hair, soft light");
    expect(shapeJobPrompt('"red hair, soft light"')).toBe("red hair, soft light");
    expect(shapeJobPrompt(`red hair, soft light${nl}and a second line`)).toBe(
      "red hair, soft light",
    );
  });

  it("refuses the field when asked over the route", async () => {
    const response = await app.request(`${adminQueueJobPath("gpu", "1")}/author`, {
      method: "POST",
      headers: OWNER,
      body: JSON.stringify({ field: "characterId", mode: "enhance" }),
    });

    expect([400, 404]).toContain(response.status);
  });
});
