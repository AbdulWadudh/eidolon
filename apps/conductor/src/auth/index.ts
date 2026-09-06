import { PAIRING } from "@eidolon/config";
import {
  getAuthBaseUrl,
  getLocalIp,
  getPairingHost,
  getPairingSecret,
  hasPairingSecret,
} from "@eidolon/config/server";
import { betterAuth } from "better-auth";
import { authOptions } from "@/auth/options";
import { hasActiveSession } from "@/auth/sessions-read";

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

export const auth = betterAuth(authOptions);

/**
 * Generates the deep-link pairing payload for mobile client onboarding.
 * Format: eidolon://pair?server=<local-ip>:<port>&token=<PAIRING_SECRET>
 */
export function generatePairingPayload(): string {
  const server = encodeURIComponent(getPairingHost());
  return `${PAIRING.uriScheme}?server=${server}&token=${encodeURIComponent(PAIRING_SECRET)}`;
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

  if (cleanToken === PAIRING_SECRET) return true;

  // A signed-in account reaches the socket with its own session token rather
  // than the device secret, so both are accepted.
  return hasActiveSession(cleanToken);
}
