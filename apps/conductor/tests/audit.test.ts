import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { AUTH_ROUTES, adminApiPath, PROMPT_KEYS } from "@eidolon/config";
import { AdminAuditViewSchema } from "@eidolon/protocol";
import { PAIRING_SECRET } from "@/auth";
import { deleteAccount } from "@/auth/roles";
import { clearAudit, listAudit } from "@/db/audit";
import { app } from "@/index";
import { loadPrompts } from "@/prompts/store";

const OWNER = { "Content-Type": "application/json", Authorization: `Bearer ${PAIRING_SECRET}` };
const MEMBER_EMAIL = "audit-test-member@eidolon.test";
const MEMBER_PASSWORD = "audit-test-password";
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
    name: "Audit Test",
  });
  const source = created.ok
    ? created
    : await attempt("/sign-in/email", { email: MEMBER_EMAIL, password: MEMBER_PASSWORD });

  const body = (await source.json()) as { token?: string; user?: { id?: string } };
  if (body.user?.id) made.add(body.user.id);
  return { "Content-Type": "application/json", Authorization: `Bearer ${body.token ?? ""}` };
}

beforeEach(async () => {
  await loadPrompts();
  clearAudit();
});

afterAll(() => {
  for (const id of made) deleteAccount(id);
  made.clear();
  clearAudit();
});

describe("the admin audit trail", () => {
  it("records a mutation without the route asking it to", async () => {
    const key = PROMPT_KEYS[0] ?? "";

    await app.request(adminApiPath("prompts", key), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: "audited" }),
    });
    await app.request(adminApiPath("prompts", key), { method: "DELETE", headers: OWNER });

    const entries = listAudit(10);
    const methods = entries.map((entry) => entry.method);

    expect(methods).toContain("PUT");
    expect(methods).toContain("DELETE");
    expect(entries[0]?.path).toContain(key);
    expect(entries[0]?.actorEmail).toBe("owner@eidolon.local");
    expect(entries[0]?.status).toBe(200);
  });

  it("does not record a read", async () => {
    await app.request(adminApiPath("prompts"), { headers: OWNER });
    await app.request(adminApiPath("users"), { headers: OWNER });

    expect(listAudit(10)).toHaveLength(0);
  });

  it("records a refusal, so an attempt is visible too", async () => {
    const headers = await memberHeaders();

    await app.request(adminApiPath("characters"), {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Should Not Exist" }),
    });

    const entries = listAudit(10);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe(403);
    expect(entries[0]?.actorEmail).toBe(MEMBER_EMAIL);
  });

  it("records an unauthenticated attempt with no actor", async () => {
    await app.request(adminApiPath("characters"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nope" }),
    });

    const entries = listAudit(10);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe(401);
    expect(entries[0]?.actorId).toBeNull();
  });

  it("records a failed mutation, not only a successful one", async () => {
    await app.request(adminApiPath("characters", "no-such-character"), {
      method: "DELETE",
      headers: OWNER,
    });

    const entries = listAudit(10);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe(404);
  });

  it("serves the log in a protocol shape, newest first", async () => {
    const key = PROMPT_KEYS[0] ?? "";
    await app.request(adminApiPath("prompts", key), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: "one" }),
    });
    await app.request(adminApiPath("prompts", key), { method: "DELETE", headers: OWNER });

    const response = await app.request(adminApiPath("audit"), { headers: OWNER });
    const parsed = AdminAuditViewSchema.safeParse(await response.json());

    expect(response.status).toBe(200);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const [newest, older] = parsed.data.entries;
    expect(newest?.method).toBe("DELETE");
    expect(older?.method).toBe("PUT");
    expect(newest?.createdAt).toBeGreaterThanOrEqual(older?.createdAt ?? 0);
  });

  it("is closed to a member and to nobody", async () => {
    const headers = await memberHeaders();

    const anonymous = await app.request(adminApiPath("audit"));
    const member = await app.request(adminApiPath("audit"), { headers });

    expect(anonymous.status).toBe(401);
    expect(member.status).toBe(403);
  });

  it("records clearing itself, so the log never silently empties", async () => {
    const key = PROMPT_KEYS[0] ?? "";
    await app.request(adminApiPath("prompts", key), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: "one" }),
    });
    await app.request(adminApiPath("prompts", key), { method: "DELETE", headers: OWNER });

    const response = await app.request(adminApiPath("audit"), { method: "DELETE", headers: OWNER });
    expect(response.status).toBe(200);

    const entries = listAudit(10);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.method).toBe("DELETE");
    expect(entries[0]?.detail).toContain("cleared");
  });
});
