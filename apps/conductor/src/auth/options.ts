import { AUTH } from "@eidolon/config";
import { getAuthBaseUrl, getPairingSecret, getTrustedOrigins } from "@eidolon/config/server";
import type { BetterAuthOptions } from "better-auth";
import { db } from "@/db";

/**
 * Kept apart from the auth instance so the migration script can build the same
 * schema without starting a server. The two must never drift: a table created
 * from one set of options and read through another is the kind of mismatch that
 * only shows up as a runtime error on a real device.
 */
export const authOptions = {
  database: db,
  secret: getPairingSecret(),
  baseURL: getAuthBaseUrl(),
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: AUTH.minPasswordLength,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: AUTH.sessionExpirySeconds,
    updateAge: AUTH.sessionRefreshSeconds,
  },
  user: {
    additionalFields: {
      displayName: { type: "string", required: false, input: true },
    },
  },
} satisfies BetterAuthOptions;
