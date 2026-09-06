import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { PAIRING_COPY } from "@eidolon/config";

// Mock react-native and react-native-mmkv before loading store
mock.module("react-native", () => ({
  Platform: { OS: "ios" },
}));

const mockMemory = new Map<string, string | boolean | number>();
mock.module("react-native-mmkv", () => ({
  createMMKV: () => ({
    getString: (key: string) => {
      const v = mockMemory.get(key);
      return typeof v === "string" ? v : undefined;
    },
    set: (key: string, val: string | boolean | number) => {
      mockMemory.set(key, val);
    },
    getBoolean: (key: string) => {
      const v = mockMemory.get(key);
      return typeof v === "boolean" ? v : undefined;
    },
    remove: (key: string) => {
      mockMemory.delete(key);
      return true;
    },
    delete: (key: string) => {
      mockMemory.delete(key);
    },
  }),
}));

// Now import after mocking
const { parsePairingUri, useConnectionStore } = await import("../store/connection");

describe("Connection Store & Pairing Engine", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockMemory.clear();
    useConnectionStore.getState().unpair();
  });

  afterEach(() => {
    useConnectionStore.getState().disconnect();
    globalThis.fetch = originalFetch;
  });

  describe("parsePairingUri", () => {
    it("properly parses valid eidolon://pair deep-links", () => {
      const uri = "eidolon://pair?server=192.168.1.39:3000&token=abc";
      const { server, token } = parsePairingUri(uri);

      expect(server).toBe("192.168.1.39:3000");
      expect(token).toBe("abc");
    });

    it("strips http/https prefixes and trailing slashes if present in server parameter", () => {
      const uri = "eidolon://pair?server=http://192.168.1.39:3000/&token=secret_123";
      const { server, token } = parsePairingUri(uri);

      expect(server).toBe("192.168.1.39:3000");
      expect(token).toBe("secret_123");
    });

    it("throws on invalid protocol", () => {
      expect(() => {
        parsePairingUri("https://pair?server=192.168.1.39:3000&token=abc");
      }).toThrow(PAIRING_COPY.notOurCode);
    });

    it("throws when server or token is missing", () => {
      expect(() => {
        parsePairingUri("eidolon://pair?server=192.168.1.39:3000");
      }).toThrow(PAIRING_COPY.incompleteCode);

      expect(() => {
        parsePairingUri("eidolon://pair?token=abc");
      }).toThrow(PAIRING_COPY.incompleteCode);
    });
  });

  describe("pairFromUri action", () => {
    it("successfully pairs when the server accepts the token", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.includes("192.168.1.39:3000/api/v1/pair/verify")) {
          return new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not Found", { status: 404 });
      }) as unknown as typeof fetch;

      const result = await useConnectionStore
        .getState()
        .pairFromUri("eidolon://pair?server=192.168.1.39:3000&token=secret_abc");

      expect(result).toBe(true);
      const state = useConnectionStore.getState();
      expect(state.isPaired).toBe(true);
      expect(state.serverHost).toBe("192.168.1.39:3000");
      expect(state.pairingToken).toBe("secret_abc");
      // Credentials are accepted; the socket decides when it becomes "connected".
      expect(state.connectionState).toBe("connecting");
    });

    it("rejects a token the server refuses instead of pairing anyway", async () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ ok: false, error: "Invalid pairing token." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })) as unknown as typeof fetch;

      await expect(
        useConnectionStore
          .getState()
          .pairFromUri("eidolon://pair?server=192.168.1.39:3000&token=stale_token"),
      ).rejects.toThrow(PAIRING_COPY.refused);

      const state = useConnectionStore.getState();
      expect(state.isPaired).toBe(false);
      expect(state.connectionState).toBe("error");
    });

    it("throws and sets error state when the server is unreachable", async () => {
      globalThis.fetch = (async () => {
        return new Response("Service Unavailable", { status: 503 });
      }) as unknown as typeof fetch;

      expect(
        useConnectionStore
          .getState()
          .pairFromUri("eidolon://pair?server=192.168.1.39:3000&token=secret_abc"),
      ).rejects.toThrow();

      const state = useConnectionStore.getState();
      expect(state.isPaired).toBe(false);
      expect(state.connectionState).toBe("error");
    });
  });

  describe("setManualConnection action", () => {
    it("successfully establishes manual connection", async () => {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.includes("localhost:3000/api/v1/pair/verify")) {
          return new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not Found", { status: 404 });
      }) as unknown as typeof fetch;

      const result = await useConnectionStore
        .getState()
        .setManualConnection("localhost:3000", "manual_token_xyz");

      expect(result).toBe(true);
      const state = useConnectionStore.getState();
      expect(state.isPaired).toBe(true);
      expect(state.serverHost).toBe("localhost:3000");
      expect(state.pairingToken).toBe("manual_token_xyz");
      // Credentials are accepted; the socket decides when it becomes "connected".
      expect(state.connectionState).toBe("connecting");
    });
  });

  describe("unpair action", () => {
    it("resets all pairing state and clears storage keys", () => {
      useConnectionStore.setState({
        serverHost: "192.168.1.39:3000",
        pairingToken: "sample_token",
        isPaired: true,
        connectionState: "connected",
      });

      useConnectionStore.getState().unpair();

      const state = useConnectionStore.getState();
      expect(state.isPaired).toBe(false);
      expect(state.serverHost).toBe("");
      expect(state.pairingToken).toBe("");
      expect(state.connectionState).toBe("disconnected");
    });
  });
});
