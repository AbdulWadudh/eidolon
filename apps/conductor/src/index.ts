import { join } from "node:path";
import {
  ADMIN_ROUTES,
  API_PREFIX,
  AUTH_ROUTES,
  HEALTH_ALIAS_PATH,
  STATIC_ROUTES,
} from "@eidolon/config";
import {
  getPublicAssetDir,
  getServerAddress,
  getServerConfig,
  isTestEnv,
} from "@eidolon/config/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { mountAdmin } from "@/api/admin";
import { buildHealthReport, v1 } from "@/api/v1";
import { auth } from "@/auth";
import { countUsers } from "@/auth/roles";
import { loadPrompts } from "@/prompts/store";
import { createQueueBoard } from "@/queue/board";
import { closeQueues } from "@/queue/queues";
import { startWorkers, stopWorkers } from "@/queue/workers";
import { loadConfigOverlay } from "@/services/config";
import { initStorage } from "@/services/storage";
import { startStorageSweep } from "@/services/storage-sweep";
import { websocket } from "@/ws";

export const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.on(["GET", "POST"], `${AUTH_ROUTES.base}/*`, (c) => auth.handler(c.req.raw));

app.route(API_PREFIX, v1);
mountAdmin(app);
app.route(ADMIN_ROUTES.queues, createQueueBoard());

app.get(HEALTH_ALIAS_PATH, async (c) => c.json(await buildHealthReport()));

app.get(STATIC_ROUTES.logo, async (c) => {
  const file = Bun.file(join(getPublicAssetDir(), "logo.svg"));

  if (!(await file.exists())) {
    return c.notFound();
  }

  return new Response(file, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

const { port } = getServerConfig();

if (!isTestEnv()) {
  void initStorage().then((ready) => {
    if (ready) startStorageSweep();
  });
  startWorkers();

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void stopWorkers()
        .then(closeQueues)
        .finally(() => process.exit(0));
    });
  }

  const address = getServerAddress();
  const reachable = address.startsWith("http") ? address : `http://${address}`;
  console.log(`[Conductor] Sign in at ${reachable} to reach this server.`);
  if (countUsers() === 0) {
    console.log("[Conductor] No accounts yet. The first account to sign up becomes the owner.");
  }
}

loadConfigOverlay();

await loadPrompts();

export default {
  port,
  fetch: app.fetch,
  websocket,
};
