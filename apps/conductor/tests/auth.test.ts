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
    const payload = generatePairingPayload();
    expect(payload).toStartWith("eidolon://pair?server=");
    expect(payload).toContain("&token=");
    expect(payload).toContain(PAIRING_SECRET);
  });

  it("advertises PUBLIC_URL over the LAN address when one is set", () => {
    const previous = process.env.PUBLIC_URL;
    process.env.PUBLIC_URL = "https://eidolon.example.com";

    try {
      expect(generatePairingPayload()).toStartWith(
        "eidolon://pair?server=https://eidolon.example.com&token=",
      );
    } finally {
      if (previous === undefined) delete process.env.PUBLIC_URL;
      else process.env.PUBLIC_URL = previous;
    }
  });
});

describe("Pairing secret is required", () => {
  it("refuses every token when PAIRING_SECRET is unset", () => {
    const previous = process.env.PAIRING_SECRET;
    delete process.env.PAIRING_SECRET;

    try {
      expect(validateToken(PAIRING_SECRET)).toBe(false);
      expect(validateToken("")).toBe(false);
      expect(validateToken("anything")).toBe(false);
      expect(validateToken("Bearer anything")).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.PAIRING_SECRET;
      } else {
        process.env.PAIRING_SECRET = previous;
      }
    }
  });

  it("refuses every token when PAIRING_SECRET is blank", () => {
    const previous = process.env.PAIRING_SECRET;
    process.env.PAIRING_SECRET = "   ";

    try {
      expect(validateToken("   ")).toBe(false);
      expect(validateToken("anything")).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.PAIRING_SECRET;
      } else {
        process.env.PAIRING_SECRET = previous;
      }
    }
  });
});
