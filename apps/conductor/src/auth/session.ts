import { AUTH } from "@eidolon/config";
import { auth, PAIRING_SECRET } from "@/auth";
import { db } from "@/db";

export interface Owner {
  id: string;
  name: string;
  email: string;
}

let localOwner: Owner | null = null;

export async function ensureLocalOwner(): Promise<Owner | null> {
  if (localOwner) return localOwner;

  const existing = db
    .query<{ id: string; name: string; email: string }, [string]>(
      "SELECT id, name, email FROM user WHERE email = ? LIMIT 1",
    )
    .get(AUTH.localOwnerEmail);

  if (existing) {
    localOwner = existing;
    return localOwner;
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: AUTH.localOwnerEmail,
        password: PAIRING_SECRET.padEnd(AUTH.minPasswordLength, "0"),
        name: AUTH.localOwnerName,
      },
    });
  } catch (error) {
    console.error("[auth] Could not provision the local owner:", error);
    return null;
  }

  const created = db
    .query<{ id: string; name: string; email: string }, [string]>(
      "SELECT id, name, email FROM user WHERE email = ? LIMIT 1",
    )
    .get(AUTH.localOwnerEmail);

  localOwner = created;
  return localOwner;
}

export function forgetLocalOwner(): void {
  localOwner = null;
}

function sessionOwner(token: string): Owner | null {
  const row = db
    .query<{ id: string; name: string; email: string; expiresAt: string | number }, [string]>(
      `SELECT u.id as id, u.name as name, u.email as email, s.expiresAt as expiresAt
       FROM session s JOIN user u ON u.id = s.userId
       WHERE s.token = ? LIMIT 1`,
    )
    .get(token);

  if (!row) return null;

  const expiry = typeof row.expiresAt === "number" ? row.expiresAt : Date.parse(row.expiresAt);
  if (Number.isFinite(expiry) && expiry < Date.now()) return null;

  return { id: row.id, name: row.name, email: row.email };
}

export function bearer(header: string | undefined | null): string {
  const value = (header ?? "").trim();
  return value.startsWith("Bearer ") ? value.slice(7).trim() : value;
}

export async function ownerFor(token: string | null | undefined): Promise<Owner | null> {
  const clean = bearer(token);
  if (clean.length === 0) return null;

  const session = sessionOwner(clean);
  if (session) return session;

  if (clean === PAIRING_SECRET) return ensureLocalOwner();
  return null;
}
