import { networkInterfaces } from "node:os";
import { betterAuth } from "better-auth";
import { db } from "@/db";

export const PAIRING_SECRET = process.env.PAIRING_SECRET || "eidolon_dev_secret_key_change_in_prod";

const PORT = Number(process.env.PORT) || 3000;

/**
 * The conductor is reached on two different origins by design: localhost from
 * the dev machine, and the LAN IP baked into the pairing QR from the phone.
 * Better Auth cannot infer one correct origin from that, so it is set explicitly
 * and both origins are trusted. Override with BETTER_AUTH_URL when the service
 * sits behind a tunnel or reverse proxy.
 */
export const AUTH_BASE_URL = process.env.BETTER_AUTH_URL || `http://${getLocalIp()}:${PORT}`;

export const auth = betterAuth({
  database: db,
  secret: PAIRING_SECRET,
  baseURL: AUTH_BASE_URL,
  trustedOrigins: [
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    `http://${getLocalIp()}:${PORT}`,
  ],
});

/**
 * Discovers the local primary IPv4 address for pairing.
 */
export function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      // Skip over non-IPv4 and internal (e.g. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

/**
 * Generates the deep-link pairing payload for mobile client onboarding.
 * Format: eidolon://pair?server=<local-ip>:<port>&token=<PAIRING_SECRET>
 */
export function generatePairingPayload(port = Number(process.env.PORT) || 3000): string {
  const host = getLocalIp();
  return `eidolon://pair?server=${host}:${port}&token=${PAIRING_SECRET}`;
}

/**
 * Validates incoming Bearer token or WebSocket token query parameter.
 */
export function validateToken(token: string | null | undefined): boolean {
  if (!token) {
    return false;
  }
  // Trim Bearer prefix if provided
  const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
  if (cleanToken.length === 0) {
    return false;
  }

  // Check matching pairing secret or active session token
  return cleanToken === PAIRING_SECRET;
}
