import { db } from "@/db";

/**
 * Read-only and synchronous on purpose: the socket upgrade check runs before
 * any request body exists and cannot await, and importing the auth instance
 * here would close a cycle back through the options module.
 */
export function hasActiveSession(token: string): boolean {
  const row = db
    .query<{ expiresAt: string | number }, [string]>(
      "SELECT expiresAt FROM session WHERE token = ? LIMIT 1",
    )
    .get(token);

  if (!row) return false;

  const expiry = typeof row.expiresAt === "number" ? row.expiresAt : Date.parse(row.expiresAt);
  return !Number.isFinite(expiry) || expiry >= Date.now();
}
