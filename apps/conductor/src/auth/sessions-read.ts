import { db } from "@/db";

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
