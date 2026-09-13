import { AUTH } from "@eidolon/config";
import { getAuthBaseUrl, getAuthSecret, getTrustedOrigins } from "@eidolon/config/server";
import type { BetterAuthOptions } from "better-auth";
import { roleForNewUser } from "@/auth/roles";
import { sqlite } from "@/db";

export const authOptions = {
  database: sqlite,
  secret: getAuthSecret(),
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
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: AUTH.defaultRole,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, role: roleForNewUser() } }),
      },
    },
  },
} satisfies BetterAuthOptions;
