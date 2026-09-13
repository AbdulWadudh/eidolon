import { ADMIN_API_PREFIX, ADMIN_API_ROUTES } from "@eidolon/config";
import { Hono } from "hono";
import { adminAudit } from "@/api/admin/audit";
import { adminCharacters } from "@/api/admin/characters";
import { adminConfig } from "@/api/admin/config";
import { adminHealth } from "@/api/admin/health";
import { adminPrompts } from "@/api/admin/prompts";
import { adminQueues } from "@/api/admin/queues";
import { adminStorage } from "@/api/admin/storage";
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
admin.route(ADMIN_API_ROUTES.audit, adminAudit);
admin.route(ADMIN_API_ROUTES.storage, adminStorage);
admin.route(ADMIN_API_ROUTES.queues, adminQueues);
admin.route(ADMIN_API_ROUTES.health, adminHealth);

export function mountAdmin(app: Hono): void {
  app.route(ADMIN_API_PREFIX, admin);
}
