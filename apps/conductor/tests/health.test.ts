import { describe, expect, it } from "bun:test";
import { COLORS } from "@eidolon/tokens";
import { app } from "../src";

describe("Conductor Health Endpoint", () => {
  it("GET /health should return 200 with ok status and themeAccent", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      service: string;
      timestamp: number;
      themeAccent: string;
    };

    expect(body.status).toBe("ok");
    expect(body.service).toBe("eidolon-conductor");
    expect(typeof body.timestamp).toBe("number");
    expect(body.themeAccent).toBe(COLORS.accentAmber);
  });
});
