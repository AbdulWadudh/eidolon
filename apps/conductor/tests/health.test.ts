import { describe, expect, it } from "bun:test";
import { apiPath, HEALTH_ALIAS_PATH } from "@eidolon/config";
import { COLORS } from "@eidolon/tokens";
import { PAIRING_SECRET } from "@/auth";
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

  it("GET /api/pair/verify rejects a missing or wrong token with 401", async () => {
    const missing = await app.request(apiPath("pairVerify"));
    expect(missing.status).toBe(401);

    const wrong = await app.request(apiPath("pairVerify"), {
      headers: { Authorization: "Bearer not-the-pairing-secret" },
    });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toMatchObject({ ok: false });
  });

  it("GET /api/pair/verify accepts the pairing secret", async () => {
    const res = await app.request(apiPath("pairVerify"), {
      headers: { Authorization: `Bearer ${PAIRING_SECRET}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, service: "eidolon-conductor" });
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

  it("GET /api/pairing returns pairing payload and secret", async () => {
    const res = await app.request(apiPath("pairing"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      pairing_url: string;
      secret: string;
      server: string;
    };

    expect(body.pairing_url).toStartWith("eidolon://pair?server=");
    expect(body.secret).toBeDefined();
    expect(body.server).toBeDefined();
  });
});
