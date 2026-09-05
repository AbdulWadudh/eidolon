import { PAIRING } from "@eidolon/config";
import {
  getAuthBaseUrl,
  getLocalIp,
  getPairingSecret,
  getServerConfig,
  getTrustedOrigins,
  hasPairingSecret,
} from "@eidolon/config/server";
import { betterAuth } from "better-auth";
import { db } from "@/db";

export { getLocalIp };

export const PAIRING_SECRET = getPairingSecret();

/**
 * The conductor is reached on two different origins by design: localhost from
 * the dev machine, and the LAN IP baked into the pairing QR from the phone.
 * Better Auth cannot infer one correct origin from that, so it is set explicitly
 * and both origins are trusted. Override with BETTER_AUTH_URL when the service
 * sits behind a tunnel or reverse proxy.
 */
export const AUTH_BASE_URL = getAuthBaseUrl();

export const auth = betterAuth({
  database: db,
  secret: PAIRING_SECRET,
  baseURL: AUTH_BASE_URL,
  trustedOrigins: getTrustedOrigins(),
});

/**
 * Generates the deep-link pairing payload for mobile client onboarding.
 * Format: eidolon://pair?server=<local-ip>:<port>&token=<PAIRING_SECRET>
 */
export function generatePairingPayload(port = getServerConfig().port): string {
  const host = getLocalIp();
  return `${PAIRING.uriScheme}?server=${host}:${port}&token=${PAIRING_SECRET}`;
}

/**
 * Validates incoming Bearer token or WebSocket token query parameter.
 */
export function validateToken(token: string | null | undefined): boolean {
  if (!hasPairingSecret() || !token) {
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
