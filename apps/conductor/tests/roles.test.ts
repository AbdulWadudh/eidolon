import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AUTH, AUTH_ROUTES, apiPath } from "@eidolon/config";
import { Hono } from "hono";
import { PAIRING_SECRET, validateToken } from "@/auth";
import { type OwnerEnv, requireOwner } from "@/auth/guard";
import { deleteAccount, getUserRole, listAccounts, setUserRole } from "@/auth/roles";
import { ownerFor } from "@/auth/session";
import { app } from "@/index";

const MEMBER_EMAIL = "roles-test-member@eidolon.test";
const MEMBER_PASSWORD = "roles-test-password";
const made = new Set<string>();

const guarded = new Hono<OwnerEnv>();
guarded.get("/", requireOwner, (c) => c.json({ seen: c.get("owner").role }));

async function post(path: string, body: Record<string, string>): Promise<Response> {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function memberToken(): Promise<string> {
  const created = await post(`${AUTH_ROUTES.base}/sign-up/email`, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    name: "Role Test",
  });

  if (created.ok) {
    const body = (await created.json()) as { token?: string; user?: { id?: string } };
    if (body.user?.id) made.add(body.user.id);
    if (body.token) return body.token;
  }

  const signedIn = await post(`${AUTH_ROUTES.base}/sign-in/email`, {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
  });
  const body = (await signedIn.json()) as { token?: string; user?: { id?: string } };
  if (body.user?.id) made.add(body.user.id);
  return body.token ?? "";
}

afterAll(() => {
  for (const id of made) deleteAccount(id);
  made.clear();
});

describe("roles", () => {
  it("hands the pairing secret an owner account", async () => {
    const account = await ownerFor(`Bearer ${PAIRING_SECRET}`);

    expect(account).not.toBeNull();
    expect(account?.email).toBe(AUTH.localOwnerEmail);
    expect(account?.role).toBe(AUTH.ownerRole);
  });

  it("makes a later account a member, not an owner", async () => {
    const token = await memberToken();
    expect(token.length).toBeGreaterThan(0);

    const account = await ownerFor(`Bearer ${token}`);
    expect(account?.role).toBe(AUTH.memberRole);
  });

  it("answers 401 with no credential, 403 for a member, 200 for an owner", async () => {
    const token = await memberToken();

    const anonymous = await guarded.request("/");
    const member = await guarded.request("/", { headers: { Authorization: `Bearer ${token}` } });
    const owner = await guarded.request("/", {
      headers: { Authorization: `Bearer ${PAIRING_SECRET}` },
    });

    expect(anonymous.status).toBe(401);
    expect(member.status).toBe(403);
    expect(owner.status).toBe(200);
    expect(await owner.json()).toEqual({ seen: AUTH.ownerRole });
  });

  it("never answers a member with a 200 carrying empty data", async () => {
    const token = await memberToken();
    const response = await guarded.request("/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(body.error).toBeString();
    expect(body.seen).toBeUndefined();
  });

  it("reports the signed-in account and its role over the session route", async () => {
    const token = await memberToken();

    const response = await app.request(apiPath("session"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await response.json()) as { account: { email: string; role: string } | null };

    expect(response.status).toBe(200);
    expect(body.account?.email).toBe(MEMBER_EMAIL);
    expect(body.account?.role).toBe(AUTH.memberRole);
  });

  it("reports no account for an unknown credential", async () => {
    const response = await app.request(apiPath("session"), {
      headers: { Authorization: "Bearer not-a-real-token" },
    });

    expect(await response.json()).toEqual({ account: null });
  });

  it("lets a session token stand in for the QR code on the socket and pair check", async () => {
    const token = await memberToken();

    expect(validateToken(token)).toBe(true);
    expect(validateToken(`Bearer ${token}`)).toBe(true);

    const verified = await app.request(apiPath("pairVerify"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const socket = await app.request(`${apiPath("ws")}?token=${encodeURIComponent(token)}`);

    expect(verified.status).toBe(200);
    expect(socket.status).not.toBe(401);
  });

  it("revokes a session the moment the role behind it changes", async () => {
    const token = await memberToken();
    const account = await ownerFor(`Bearer ${token}`);
    const before = getUserRole(account?.id ?? "");

    setUserRole(account?.id ?? "", AUTH.ownerRole);

    expect(await ownerFor(`Bearer ${token}`)).toBeNull();
    expect(validateToken(token)).toBe(false);

    setUserRole(account?.id ?? "", before ?? AUTH.memberRole);
  });

  it("leaves a session alone when the role is written but unchanged", async () => {
    const token = await memberToken();
    const account = await ownerFor(`Bearer ${token}`);
    const current = getUserRole(account?.id ?? "");

    setUserRole(account?.id ?? "", current ?? AUTH.memberRole);

    expect(await ownerFor(`Bearer ${token}`)).not.toBeNull();
  });

  it("keeps every account it lists on one of the known roles", () => {
    for (const account of listAccounts()) {
      expect([AUTH.ownerRole, AUTH.memberRole]).toContain(account.role);
    }
  });
});

describe("a conductor booting on an empty data directory", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "eidolon-fresh-"));

  afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

  it("creates its auth tables and makes the first account the owner", async () => {
    const proc = Bun.spawn(["bun", "tests/support/fresh-boot.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, EIDOLON_DATA_DIR: dataDir, NODE_ENV: "test" },
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    const line = stdout.trim().split("\n").at(-1) ?? "{}";
    const report = JSON.parse(line) as {
      accounts: { email: string; role: string }[];
      firstTokenIssued: boolean;
      secondTokenIssued: boolean;
      sessionStatus: number;
      sessionBody: { account: { email: string; role: string } | null };
      signInWorks: boolean;
    };

    expect(report.accounts).toEqual([
      { email: "first@fresh.local", role: AUTH.ownerRole },
      { email: "second@fresh.local", role: AUTH.memberRole },
    ]);
    expect(report.firstTokenIssued).toBe(true);
    expect(report.secondTokenIssued).toBe(true);
    expect(report.sessionStatus).toBe(200);
    expect(report.sessionBody.account?.role).toBe(AUTH.ownerRole);
    expect(report.signInWorks).toBe(true);
  }, 30000);
});
