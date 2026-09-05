import { describe, expect, it } from "bun:test";
import { generatePairingPayload, PAIRING_SECRET, validateToken } from "@/auth";

describe("Authentication & Pairing", () => {
  it("validates exact pairing secret", () => {
    expect(validateToken(PAIRING_SECRET)).toBe(true);
  });

  it("validates Bearer token format", () => {
    expect(validateToken(`Bearer ${PAIRING_SECRET}`)).toBe(true);
  });

  it("rejects invalid token", () => {
    expect(validateToken("invalid_random_secret_token")).toBe(false);
  });

  it("rejects null, undefined, or empty token", () => {
    expect(validateToken(null)).toBe(false);
    expect(validateToken(undefined)).toBe(false);
    expect(validateToken("")).toBe(false);
    expect(validateToken("   ")).toBe(false);
    expect(validateToken("Bearer ")).toBe(false);
  });

  it("generates correct deep-link pairing payload format", () => {
    const payload = generatePairingPayload(3000);
    expect(payload).toStartWith("eidolon://pair?server=");
    expect(payload).toContain(":3000&token=");
    expect(payload).toContain(PAIRING_SECRET);
  });
});
