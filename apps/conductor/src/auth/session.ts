import { roleOrDefault, type UserRole } from "@eidolon/config";
import { db } from "@/db";

export interface Owner {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function sessionOwner(token: string): Owner | null {
  const row = db
    .query<
      {
        id: string;
        name: string;
        email: string;
        role: string | null;
        expiresAt: string | number;
      },
      [string]
    >(
      `SELECT u.id as id, u.name as name, u.email as email, u.role as role, s.expiresAt as expiresAt
       FROM session s JOIN user u ON u.id = s.userId
       WHERE s.token = ? LIMIT 1`,
    )
    .get(token);

  if (!row) return null;

  const expiry = typeof row.expiresAt === "number" ? row.expiresAt : Date.parse(row.expiresAt);
  if (Number.isFinite(expiry) && expiry < Date.now()) return null;

  return { id: row.id, name: row.name, email: row.email, role: roleOrDefault(row.role) };
}

export function bearer(header: string | undefined | null): string {
  const value = (header ?? "").trim();
  return value.startsWith("Bearer ") ? value.slice(7).trim() : value;
}

export async function ownerFor(token: string | null | undefined): Promise<Owner | null> {
  const clean = bearer(token);
  if (clean.length === 0) return null;
  return sessionOwner(clean);
}
