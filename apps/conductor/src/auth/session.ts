import { AUTH, roleOrDefault, type UserRole } from "@eidolon/config";
import { auth, PAIRING_SECRET } from "@/auth";
import { isOwnerRole, setUserRole } from "@/auth/roles";
import { db } from "@/db";

export interface Owner {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface OwnerRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

let localOwner: Owner | null = null;

function readByEmail(email: string): OwnerRow | null {
  return db
    .query<OwnerRow, [string]>("SELECT id, name, email, role FROM user WHERE email = ? LIMIT 1")
    .get(email);
}

function claimLocalOwner(row: OwnerRow): Owner {
  if (!isOwnerRole(roleOrDefault(row.role))) setUserRole(row.id, AUTH.ownerRole);
  return { id: row.id, name: row.name, email: row.email, role: AUTH.ownerRole };
}

export async function ensureLocalOwner(): Promise<Owner | null> {
  if (localOwner) return localOwner;

  const existing = readByEmail(AUTH.localOwnerEmail);

  if (existing) {
    localOwner = claimLocalOwner(existing);
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

  const created = readByEmail(AUTH.localOwnerEmail);

  localOwner = created ? claimLocalOwner(created) : null;
  return localOwner;
}

export function forgetLocalOwner(): void {
  localOwner = null;
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

  const session = sessionOwner(clean);
  if (session) return session;

  if (clean === PAIRING_SECRET) return ensureLocalOwner();
  return null;
}
