import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { CONNECT_COPY } from "@eidolon/config";
import "./support/mock-native";

const { normalizeHost, useConnectionStore } = await import("../store/connection");

describe("Connection Store", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useConnectionStore.getState().signOut();
    useConnectionStore.setState({ serverHost: "" });
  });

  afterEach(() => {
    useConnectionStore.getState().disconnect();
    globalThis.fetch = originalFetch;
  });

  describe("normalizeHost", () => {
    it("strips a plain scheme and trailing slashes", () => {
      expect(normalizeHost("http://192.168.1.39:3000/")).toBe("192.168.1.39:3000");
      expect(normalizeHost("  192.168.1.39:3000  ")).toBe("192.168.1.39:3000");
    });

    it("keeps https so a tunnelled conductor stays secure", () => {
      expect(normalizeHost("https://3000.k79.quest/")).toBe("https://3000.k79.quest");
    });
  });

  describe("startSession", () => {
    it("remembers the host and session token, and counts as signed in", () => {
      useConnectionStore.getState().startSession("http://localhost:3000/", "session_abc");

      const state = useConnectionStore.getState();
      expect(state.serverHost).toBe("localhost:3000");
      expect(state.sessionToken).toBe("session_abc");
      expect(state.isSignedIn).toBe(true);
    });

    it("refuses a blank host or token instead of half-signing in", () => {
      expect(() => useConnectionStore.getState().startSession("", "session_abc")).toThrow(
        CONNECT_COPY.missingFields,
      );
      expect(() => useConnectionStore.getState().startSession("localhost:3000", "  ")).toThrow(
        CONNECT_COPY.missingFields,
      );
      expect(useConnectionStore.getState().isSignedIn).toBe(false);
    });
  });

  describe("signOut", () => {
    it("drops the token but keeps the address for the next sign-in", () => {
      useConnectionStore.getState().startSession("localhost:3000", "session_abc");
      useConnectionStore.getState().signOut();

      const state = useConnectionStore.getState();
      expect(state.sessionToken).toBe("");
      expect(state.isSignedIn).toBe(false);
      expect(state.serverHost).toBe("localhost:3000");
    });
  });

  describe("initializeConnection", () => {
    it("stays signed out when only the address survived", () => {
      useConnectionStore.getState().startSession("localhost:3000", "session_abc");
      useConnectionStore.getState().signOut();
      useConnectionStore.getState().initializeConnection();

      expect(useConnectionStore.getState().isSignedIn).toBe(false);
    });

    it("comes back signed in when both the address and token survived", () => {
      useConnectionStore.getState().startSession("localhost:3000", "session_abc");
      useConnectionStore.getState().initializeConnection();

      const state = useConnectionStore.getState();
      expect(state.isSignedIn).toBe(true);
      expect(state.sessionToken).toBe("session_abc");
    });
  });
});
