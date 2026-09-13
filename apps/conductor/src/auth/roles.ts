import { AUTH, roleOrDefault, type UserRole } from "@eidolon/config";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { account, session, user } from "@/db/auth-tables";

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string | number | null;
}

interface RawAccountRow {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  createdAt: string | number | null;
}

const ACCOUNT_COLUMNS = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
};

function toAccount(row: RawAccountRow): AccountRow {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email,
    role: roleOrDefault(row.role),
    createdAt: row.createdAt,
  };
}

export function countUsers(): number {
  return db.select({ total: count() }).from(user).get()?.total ?? 0;
}

export function countOwners(): number {
  return (
    db.select({ total: count() }).from(user).where(eq(user.role, AUTH.ownerRole)).get()?.total ?? 0
  );
}

export function roleForNewUser(): UserRole {
  return countUsers() === 0 ? AUTH.ownerRole : AUTH.defaultRole;
}

export function getUserRole(userId: string): UserRole | null {
  const row = db.select({ role: user.role }).from(user).where(eq(user.id, userId)).get();
  return row ? roleOrDefault(row.role) : null;
}

export function revokeSessions(userId: string): number {
  return db.delete(session).where(eq(session.userId, userId)).returning({ id: session.id }).all()
    .length;
}

export function setUserRole(userId: string, role: UserRole): boolean {
  const current = getUserRole(userId);
  const changed =
    db.update(user).set({ role }).where(eq(user.id, userId)).returning({ id: user.id }).all()
      .length > 0;

  if (changed && current !== role) revokeSessions(userId);
  return changed;
}

export function isOwnerRole(role: UserRole | null | undefined): boolean {
  return role === AUTH.ownerRole;
}

export function listAccounts(): AccountRow[] {
  return db
    .select(ACCOUNT_COLUMNS)
    .from(user)
    .orderBy(asc(user.createdAt), asc(user.id))
    .all()
    .map(toAccount);
}

export function getAccount(userId: string): AccountRow | null {
  const row = db.select(ACCOUNT_COLUMNS).from(user).where(eq(user.id, userId)).get();
  return row ? toAccount(row) : null;
}

export function deleteAccount(userId: string): boolean {
  revokeSessions(userId);
  db.delete(account).where(eq(account.userId, userId)).run();
  return db.delete(user).where(eq(user.id, userId)).returning({ id: user.id }).all().length > 0;
}

export function renameAccount(userId: string, name: string): boolean {
  return (
    db.update(user).set({ name }).where(eq(user.id, userId)).returning({ id: user.id }).all()
      .length > 0
  );
}
