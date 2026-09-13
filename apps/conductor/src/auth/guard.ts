import { AUTH_COPY } from "@eidolon/config";
import type { Context, MiddlewareHandler } from "hono";
import { isOwnerRole } from "@/auth/roles";
import { type Owner, ownerFor } from "@/auth/session";

export interface OwnerEnv {
  Variables: { owner: Owner };
}

export function credentialFrom(c: Context): string | null {
  return c.req.header("Authorization") ?? c.req.query("token") ?? null;
}

export async function accountFor(c: Context): Promise<Owner | null> {
  return ownerFor(credentialFrom(c));
}

export const requireOwner: MiddlewareHandler<OwnerEnv> = async (c, next) => {
  const account = await accountFor(c);

  if (!account) return c.json({ error: AUTH_COPY.signInRequired }, 401);
  if (!isOwnerRole(account.role)) return c.json({ error: AUTH_COPY.ownerOnly }, 403);

  c.set("owner", account);
  await next();
};
