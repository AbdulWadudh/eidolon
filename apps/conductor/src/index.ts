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
  getServerConfig,
  hasPairingSecret,
  isTestEnv,
} from "@eidolon/config/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { buildHealthReport, v1 } from "@/api/v1";
import { auth, generatePairingPayload } from "@/auth";
import { renderBanner, renderPairingQr } from "@/pairing/banner";
import { loadPrompts } from "@/prompts/store";
import { createQueueBoard } from "@/queue/board";
import { closeQueues } from "@/queue/queues";
import { startWorkers, stopWorkers } from "@/queue/workers";
import { initStorage } from "@/services/storage";
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
const pairingPayload = generatePairingPayload();

if (!isTestEnv()) {
  void initStorage();
  startWorkers();

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void stopWorkers()
        .then(closeQueues)
        .finally(() => process.exit(0));
    });
  }

  if (!hasPairingSecret()) {
    console.error("[Auth] PAIRING_SECRET is not set. Every pairing attempt and socket will be");
    console.error("[Auth] refused. Set it in apps/conductor/.env before pairing a device.");
  }

  console.log(renderBanner(pairingPayload));
  console.log(renderPairingQr(pairingPayload, process.stdout.columns ?? 80));
}

await loadPrompts();

export default {
  port,
  fetch: app.fetch,
  websocket,
};
