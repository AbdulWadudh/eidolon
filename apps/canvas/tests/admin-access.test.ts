import { afterEach, describe, expect, it } from "bun:test";
import { AUTH, adminApiPath } from "@eidolon/config";
import { mockMemory } from "./support/mock-native";

const { useAuthStore } = await import("../store/auth-store");
const { AdminRequestError, fetchAccounts, fetchPrompts } = await import("../store/admin-api");

const HOST = "conductor.test:3000";
const TOKEN = "a-session-token";

const realFetch = globalThis.fetch;

function respondWith(status: number, body: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  mockMemory.clear();
  useAuthStore.setState({ account: null, isResolved: false });
});

describe("who the dashboard opens for", () => {
  it("treats only the owner role as an owner", () => {
    useAuthStore.getState().setAccount({
      id: "u1",
      name: "Owner",
      email: "owner@x",
      role: AUTH.ownerRole,
    });
    expect(useAuthStore.getState().account?.role).toBe(AUTH.ownerRole);

    useAuthStore.getState().setAccount({
      id: "u2",
      name: "Member",
      email: "member@x",
      role: AUTH.memberRole,
    });
    expect(useAuthStore.getState().account?.role).toBe(AUTH.memberRole);
  });

  it("resolves to no account when the conductor reports none, so the gate closes", async () => {
    respondWith(200, { account: null });

    await useAuthStore.getState().refresh(HOST, TOKEN);

    expect(useAuthStore.getState().account).toBeNull();
    expect(useAuthStore.getState().isResolved).toBe(true);
  });

  it("forgets a remembered account when the conductor stops recognising it", async () => {
    useAuthStore.getState().setAccount({
      id: "u1",
      name: "Owner",
      email: "owner@x",
      role: AUTH.ownerRole,
    });
    respondWith(401, { account: null });

    await useAuthStore.getState().refresh(HOST, TOKEN);

    expect(useAuthStore.getState().account).toBeNull();
  });
});

describe("the admin client", () => {
  it("addresses the versioned admin prefix", () => {
    expect(adminApiPath("prompts")).toBe("/api/v1/admin/prompts");
    expect(adminApiPath("users", "abc")).toBe("/api/v1/admin/users/abc");
    expect(adminApiPath("theme", "a/b")).toBe("/api/v1/admin/theme/a%2Fb");
  });

  it("surfaces a 403 as a typed error carrying the conductor's reason", async () => {
    respondWith(403, { error: "This needs the owner account." });

    const failure = await fetchAccounts(HOST, TOKEN).catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(AdminRequestError);
    expect((failure as InstanceType<typeof AdminRequestError>).status).toBe(403);
    expect((failure as Error).message).toBe("This needs the owner account.");
  });

  it("does not resolve a refusal into empty data", async () => {
    respondWith(401, { error: "Sign in to reach this." });

    const failure = await fetchPrompts(HOST, TOKEN).catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(AdminRequestError);
    expect((failure as InstanceType<typeof AdminRequestError>).status).toBe(401);
  });

  it("returns the body on success", async () => {
    respondWith(200, { prompts: [{ key: "a", value: "b" }] });

    const body = await fetchPrompts(HOST, TOKEN);
    expect(body.prompts).toHaveLength(1);
  });
});
