import { AUTH } from "@eidolon/config";
import { auth, PAIRING_SECRET } from "@/auth";
import { db } from "@/db";

export interface Owner {
  id: string;
  name: string;
  email: string;
}

/**
 * The conductor is paired with a device, not signed into by a person, and a
 * character still has to belong to someone. The first boot after auth exists
 * provisions one local account and the paired device acts as it, so the single
 * user keeps working exactly as before while characters gain a real owner.
 * A second person signing up gets their own account and their own roster.
 */
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
        // The device already holds this secret; it is not an extra credential.
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

/**
 * A request carries either a real session token or the pairing secret. The
 * second is the paired device, which acts as the local owner.
 */
export async function ownerFor(token: string | null | undefined): Promise<Owner | null> {
  const clean = bearer(token);
  if (clean.length === 0) return null;

  const session = sessionOwner(clean);
  if (session) return session;

  if (clean === PAIRING_SECRET) return ensureLocalOwner();
  return null;
}
