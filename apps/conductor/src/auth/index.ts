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
import { ensureAuthSchema } from "@/auth/schema";
import { hasActiveSession } from "@/auth/sessions-read";

export { getLocalIp };

export const PAIRING_SECRET = getPairingSecret();

export const AUTH_BASE_URL = getAuthBaseUrl();

await ensureAuthSchema();

export const auth = betterAuth(authOptions);

export function generatePairingPayload(): string {
  const server = encodeURIComponent(getPairingHost());
  return `${PAIRING.uriScheme}?server=${server}&token=${encodeURIComponent(PAIRING_SECRET)}`;
}

export function validateToken(token: string | null | undefined): boolean {
  if (!hasPairingSecret() || !token) {
    return false;
  }
  const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
  if (cleanToken.length === 0) {
    return false;
  }

  if (cleanToken === PAIRING_SECRET) return true;

  return hasActiveSession(cleanToken);
}
