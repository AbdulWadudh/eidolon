import { AUTH_COPY } from "@eidolon/config";
import type { Context, MiddlewareHandler } from "hono";
import { isOwnerRole } from "@/auth/roles";
import { type Owner, ownerFor } from "@/auth/session";
import { recordAudit } from "@/db/audit";

export interface OwnerEnv {
  Variables: { owner: Owner; auditDetail?: string };
}

const READ_ONLY = new Set(["GET", "HEAD", "OPTIONS"]);

export function credentialFrom(c: Context): string | null {
  return c.req.header("Authorization") ?? c.req.query("token") ?? null;
}

export async function accountFor(c: Context): Promise<Owner | null> {
  return ownerFor(credentialFrom(c));
}

function audit(c: Context<OwnerEnv>, account: Owner | null, status: number): void {
  if (READ_ONLY.has(c.req.method)) return;

  try {
    recordAudit({
      actorId: account?.id ?? null,
      actorEmail: account?.email ?? null,
      method: c.req.method,
      path: c.req.path,
      status,
      detail: c.get("auditDetail") ?? null,
    });
  } catch (error) {
    console.error("[audit] Could not record an admin mutation:", error);
  }
}

export const requireOwner: MiddlewareHandler<OwnerEnv> = async (c, next) => {
  const account = await accountFor(c);

  if (!account) {
    audit(c, null, 401);
    return c.json({ error: AUTH_COPY.signInRequired }, 401);
  }

  if (!isOwnerRole(account.role)) {
    audit(c, account, 403);
    return c.json({ error: AUTH_COPY.ownerOnly }, 403);
  }

  c.set("owner", account);
  await next();
  audit(c, account, c.res.status);
};
