import { getLocalIp, getServerAddress } from "@eidolon/config/server";
import { betterAuth } from "better-auth";
import { authOptions } from "@/auth/options";
import { ensureAuthSchema } from "@/auth/schema";

export { getLocalIp, getServerAddress };

await ensureAuthSchema();

export const auth = betterAuth(authOptions);
