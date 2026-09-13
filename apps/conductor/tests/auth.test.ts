import { describe, expect, it } from "bun:test";
import { AUTH, apiPath } from "@eidolon/config";
import { bearer, ownerFor } from "@/auth/session";
import { app } from "@/index";
import { TEST_OWNER_ID, TEST_TOKEN } from "./support/session";

describe("Session authentication", () => {
  it("reads a token with or without the Bearer prefix", () => {
    expect(bearer(`Bearer ${TEST_TOKEN}`)).toBe(TEST_TOKEN);
    expect(bearer(TEST_TOKEN)).toBe(TEST_TOKEN);
    expect(bearer(null)).toBe("");
  });

  it("resolves a live session to the account behind it", async () => {
    const account = await ownerFor(`Bearer ${TEST_TOKEN}`);

    expect(account?.id).toBe(TEST_OWNER_ID);
    expect(account?.role).toBe(AUTH.ownerRole);
  });

  it("refuses anything that is not a live session", async () => {
    expect(await ownerFor("Bearer made-up")).toBeNull();
    expect(await ownerFor("   ")).toBeNull();
    expect(await ownerFor(undefined)).toBeNull();
  });

  it("no longer answers the pairing routes", async () => {
    for (const path of ["/pairing", "/pair/verify", "/pairing/qr", "/pairing/status"]) {
      const response = await app.request(`${apiPath("health").replace("/health", "")}${path}`);
      expect(response.status).toBe(404);
    }
  });

  it("reports the signed-in account on the session route", async () => {
    const response = await app.request(apiPath("session"), {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    const body = (await response.json()) as { account: { id: string } | null };

    expect(response.status).toBe(200);
    expect(body.account?.id).toBe(TEST_OWNER_ID);
  });

  it("reports no account without a credential", async () => {
    const response = await app.request(apiPath("session"));
    expect(await response.json()).toEqual({ account: null });
  });
});
