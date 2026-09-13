import { AUTH, roleOrDefault, type UserRole } from "@eidolon/config";
import { db } from "@/db";

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
  return db.query<{ total: number }, []>("SELECT COUNT(*) as total FROM user").get()?.total ?? 0;
}

export function countOwners(): number {
  return (
    db
      .query<{ total: number }, [string]>("SELECT COUNT(*) as total FROM user WHERE role = ?")
      .get(AUTH.ownerRole)?.total ?? 0
  );
}

export function roleForNewUser(): UserRole {
  return countUsers() === 0 ? AUTH.ownerRole : AUTH.defaultRole;
}

export function getUserRole(userId: string): UserRole | null {
  const row = db
    .query<{ role: string | null }, [string]>("SELECT role FROM user WHERE id = ? LIMIT 1")
    .get(userId);
  return row ? roleOrDefault(row.role) : null;
}

export function revokeSessions(userId: string): number {
  return db.query("DELETE FROM session WHERE userId = ?").run(userId).changes;
}

export function setUserRole(userId: string, role: UserRole): boolean {
  const current = getUserRole(userId);
  const changed = db.query("UPDATE user SET role = ?2 WHERE id = ?1").run(userId, role).changes > 0;

  if (changed && current !== role) revokeSessions(userId);
  return changed;
}

export function isOwnerRole(role: UserRole | null | undefined): boolean {
  return role === AUTH.ownerRole;
}

export function listAccounts(): AccountRow[] {
  return db
    .query<RawAccountRow, []>(
      "SELECT id, name, email, role, createdAt FROM user ORDER BY createdAt ASC, id ASC",
    )
    .all()
    .map(toAccount);
}

export function getAccount(userId: string): AccountRow | null {
  const row = db
    .query<RawAccountRow, [string]>(
      "SELECT id, name, email, role, createdAt FROM user WHERE id = ? LIMIT 1",
    )
    .get(userId);
  return row ? toAccount(row) : null;
}

export function deleteAccount(userId: string): boolean {
  revokeSessions(userId);
  db.query("DELETE FROM account WHERE userId = ?").run(userId);
  return db.query("DELETE FROM user WHERE id = ?").run(userId).changes > 0;
}

export function renameAccount(userId: string, name: string): boolean {
  return db.query("UPDATE user SET name = ?2 WHERE id = ?1").run(userId, name).changes > 0;
}
