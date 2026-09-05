import { describe, expect, it } from "bun:test";
import {
  API_PREFIX,
  API_ROUTES,
  API_VERSION,
  apiPath,
  apiUrl,
  HEALTH_ALIAS_PATH,
  socketUrl,
  stripAuthority,
} from "../src";

describe("API versioning", () => {
  it("prefixes every route with the version", () => {
    expect(API_PREFIX).toBe(`/api/${API_VERSION}`);

    for (const route of Object.keys(API_ROUTES) as (keyof typeof API_ROUTES)[]) {
      expect(apiPath(route)).toStartWith(`/api/${API_VERSION}/`);
    }
  });

  it("declares no route that already carries the prefix", () => {
    for (const path of Object.values(API_ROUTES)) {
      expect(path).toStartWith("/");
      expect(path).not.toContain("/api/");
      expect(path).not.toContain(API_VERSION);
    }
  });

  it("resolves the documented paths", () => {
    expect(apiPath("health")).toBe("/api/v1/health");
    expect(apiPath("pairing")).toBe("/api/v1/pairing");
    expect(apiPath("pairVerify")).toBe("/api/v1/pair/verify");
    expect(apiPath("pairingQr")).toBe("/api/v1/pairing/qr");
    expect(apiPath("ws")).toBe("/api/v1/ws");
  });

  it("keeps health reachable unversioned for infrastructure", () => {
    expect(HEALTH_ALIAS_PATH).toBe("/health");
    expect(HEALTH_ALIAS_PATH).not.toContain(API_VERSION);
  });
});

describe("URL builders", () => {
  it("builds an http URL from a host:port authority", () => {
    expect(apiUrl("192.168.1.39:3000", "pairVerify")).toBe(
      "http://192.168.1.39:3000/api/v1/pair/verify",
    );
    expect(apiUrl("example.com", "health", "https")).toBe("https://example.com/api/v1/health");
  });

  it("builds a socket URL with the token encoded", () => {
    expect(socketUrl("192.168.1.39:3000", "a b/c")).toBe(
      "ws://192.168.1.39:3000/api/v1/ws?token=a%20b%2Fc",
    );
    expect(socketUrl("example.com", "t", "wss")).toStartWith("wss://");
  });

  it("tolerates a pasted scheme or trailing slash", () => {
    expect(stripAuthority("https://host:3000/")).toBe("host:3000");
    expect(stripAuthority("http://host:3000")).toBe("host:3000");
    expect(stripAuthority("host:3000")).toBe("host:3000");
    expect(apiUrl("https://host:3000/", "health")).toBe("http://host:3000/api/v1/health");
  });
});
