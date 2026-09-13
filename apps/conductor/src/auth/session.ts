import { roleOrDefault, type UserRole } from "@eidolon/config";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { session, user } from "@/db/auth-tables";

export interface Owner {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function sessionOwner(token: string): Owner | null {
  const row = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .where(eq(session.token, token))
    .get();

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
