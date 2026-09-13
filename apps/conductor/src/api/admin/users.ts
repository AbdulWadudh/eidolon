import { AUTH, AUTH_COPY, isUserRole } from "@eidolon/config";
import { AdminAccountPatchSchema } from "@eidolon/protocol";
import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import {
  countOwners,
  deleteAccount,
  getAccount,
  isOwnerRole,
  listAccounts,
  renameAccount,
  setUserRole,
} from "@/auth/roles";
import { forgetLocalOwner } from "@/auth/session";

export const adminUsers = new Hono<OwnerEnv>();

export function isLastOwner(userId: string): boolean {
  const account = getAccount(userId);
  return account !== null && isOwnerRole(account.role) && countOwners() <= 1;
}

adminUsers.get("/", (c) => c.json({ accounts: listAccounts() }));

adminUsers.get("/:id", (c) => {
  const account = getAccount(c.req.param("id"));
  if (!account) return c.json({ error: AUTH_COPY.noSuchAccount }, 404);
  return c.json({ account });
});

adminUsers.patch("/:id", async (c) => {
  const id = c.req.param("id");
  if (!getAccount(id)) return c.json({ error: AUTH_COPY.noSuchAccount }, 404);

  const parsed = AdminAccountPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Body must carry a role or a name." }, 400);
  }

  const { role, name } = parsed.data;

  if (role !== undefined) {
    if (!isUserRole(role)) return c.json({ error: AUTH_COPY.unknownRole }, 400);
    if (role !== AUTH.ownerRole && isLastOwner(id)) {
      return c.json({ error: AUTH_COPY.lastOwner }, 409);
    }
    setUserRole(id, role);
  }

  if (name !== undefined) renameAccount(id, name.trim());

  forgetLocalOwner();
  return c.json({ account: getAccount(id) });
});

adminUsers.delete("/:id", (c) => {
  const id = c.req.param("id");
  if (!getAccount(id)) return c.json({ error: AUTH_COPY.noSuchAccount }, 404);

  if (c.get("owner").id === id) return c.json({ error: AUTH_COPY.notYourself }, 403);
  if (isLastOwner(id)) return c.json({ error: AUTH_COPY.lastOwner }, 409);

  deleteAccount(id);
  forgetLocalOwner();
  return c.json({ ok: true });
});
