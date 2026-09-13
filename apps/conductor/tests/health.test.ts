import { describe, expect, it } from "bun:test";
import { apiPath, HEALTH_ALIAS_PATH } from "@eidolon/config";
import { COLORS } from "@eidolon/tokens";
import { app } from "@/index";

describe("Conductor Health & REST Endpoints", () => {
  it("GET /health returns 200 with service health breakdown and themeAccent", async () => {
    const res = await app.request(apiPath("health"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      service: string;
      uptime: number;
      timestamp: number;
      services: {
        sqlite: string;
        lancedb: string;
        llm: string;
        comfyui: string;
      };
      webSearch: {
        primary: string;
        hasSerperFallback: boolean;
        hasExaFallback: boolean;
      };
      themeAccent: string;
    };

    expect(body.status).toBe("ok");
    expect(body.service).toBe("eidolon-conductor");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.timestamp).toBe("number");
    expect(body.services.sqlite).toBe("healthy");
    expect(body.services.lancedb).toBe("healthy");
    expect(body.webSearch.primary).toBe("duck-duck-scrape");
    expect(typeof body.webSearch.hasSerperFallback).toBe("boolean");
    expect(typeof body.webSearch.hasExaFallback).toBe("boolean");
    expect(body.themeAccent).toBe(COLORS.accentAmber);
  });

  it("serves health unversioned as well, for infrastructure probes", async () => {
    const res = await app.request(HEALTH_ALIAS_PATH);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe("ok");
  });

  it("no longer answers the unversioned API paths", async () => {
    for (const dead of ["/api/pairing", "/api/pair/verify", "/api/pairing/qr", "/ws"]) {
      expect((await app.request(dead)).status).toBe(404);
    }
  });

  it("no longer answers any pairing route", async () => {
    for (const dead of [
      "/api/v1/pairing",
      "/api/v1/pair/verify",
      "/api/v1/pairing/qr",
      "/api/v1/pairing/status",
    ]) {
      expect((await app.request(dead)).status).toBe(404);
    }
  });
});
