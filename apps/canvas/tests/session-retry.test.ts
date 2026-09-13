import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { SOCKET } from "@eidolon/config";
import "./support/mock-native";

const { reviewSessionAfterRetries, useConnectionStore } = await import("../store/connection");

describe("A socket that keeps being refused", () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  const answer = (status: number, body: unknown) => {
    globalThis.fetch = (async (_url: string, _init?: RequestInit) => {
      calls += 1;
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
  };

  beforeEach(() => {
    calls = 0;
    useConnectionStore.getState().startSession("localhost:3000", "stale-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    useConnectionStore.getState().signOut();
  });

  it("signs out once the conductor says the credential belongs to nobody", async () => {
    answer(200, { account: null });

    await reviewSessionAfterRetries(SOCKET.reVerifyAfterAttempts);

    const state = useConnectionStore.getState();
    expect(state.isSignedIn).toBe(false);
    expect(state.sessionToken).toBe("");
  });

  it("signs out on an outright 401", async () => {
    answer(401, { error: "Sign in to reach this." });

    await reviewSessionAfterRetries(SOCKET.reVerifyAfterAttempts);

    expect(useConnectionStore.getState().isSignedIn).toBe(false);
  });

  it("keeps the session when the conductor still knows the account", async () => {
    answer(200, { account: { id: "abc", email: "someone@eidolon.test" } });

    await reviewSessionAfterRetries(SOCKET.reVerifyAfterAttempts);

    expect(useConnectionStore.getState().isSignedIn).toBe(true);
  });

  it("keeps the session when the conductor is simply unreachable", async () => {
    globalThis.fetch = (async (_url: string, _init?: RequestInit) => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    await reviewSessionAfterRetries(SOCKET.reVerifyAfterAttempts);

    expect(useConnectionStore.getState().isSignedIn).toBe(true);
  });

  it("does not ask on every retry, only once the backoff has run out", async () => {
    answer(200, { account: null });

    await reviewSessionAfterRetries(SOCKET.reVerifyAfterAttempts - 1);

    expect(calls).toBe(0);
    expect(useConnectionStore.getState().isSignedIn).toBe(true);
  });
});
