import { ADMIN_API_PREFIX, ADMIN_API_ROUTES } from "@eidolon/config";
import { Hono } from "hono";
import { adminCharacters } from "@/api/admin/characters";
import { adminConfig } from "@/api/admin/config";
import { adminPrompts } from "@/api/admin/prompts";
import { adminTheme } from "@/api/admin/theme";
import { adminUsers } from "@/api/admin/users";
import { type OwnerEnv, requireOwner } from "@/auth/guard";

export const admin = new Hono<OwnerEnv>();

admin.use("*", requireOwner);

admin.route(ADMIN_API_ROUTES.prompts, adminPrompts);
admin.route(ADMIN_API_ROUTES.characters, adminCharacters);
admin.route(ADMIN_API_ROUTES.users, adminUsers);
admin.route(ADMIN_API_ROUTES.theme, adminTheme);
admin.route(ADMIN_API_ROUTES.config, adminConfig);

export function mountAdmin(app: Hono): void {
  app.route(ADMIN_API_PREFIX, admin);
}
