import { join } from "node:path";
import {
  ADMIN_ROUTES,
  API_PREFIX,
  apiPath,
  HEALTH_ALIAS_PATH,
  STATIC_ROUTES,
} from "@eidolon/config";
import {
  getPairingHost,
  getPublicAssetDir,
  getServerConfig,
  hasPairingSecret,
  isTestEnv,
} from "@eidolon/config/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { buildHealthReport, v1 } from "@/api/v1";
import { generatePairingPayload, getLocalIp, PAIRING_SECRET } from "@/auth";
import { buildQrMatrix, qrTerminalColumns, renderQrTerminal } from "@/pairing/qr";
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
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

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

const { port, host } = getServerConfig();
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
}

if (!isTestEnv()) {
  console.log("\n========================================");
  console.log("  EIDOLON CONDUCTOR GATEWAY ACTIVE");
  console.log(`  Listening on: http://${host}:${port}`);
  console.log(`  API base:     ${API_PREFIX}`);
  console.log(`  Server:  ${getPairingHost()}`);
  console.log(`  Token:   ${PAIRING_SECRET}`);
  console.log(`  Pairing: ${pairingPayload}`);
  console.log(`  Bull-Board Dashboard: http://localhost:${port}${ADMIN_ROUTES.queues}`);
  console.log("========================================\n");
  const matrix = buildQrMatrix(pairingPayload);
  const columns = process.stdout.columns ?? 80;
  const extraQuiet = Math.max(
    0,
    Math.min(4, Math.floor((columns - qrTerminalColumns(matrix)) / 4)),
  );

  console.log(renderQrTerminal(matrix, extraQuiet));
  console.log(`\n  Scannable page: http://${getLocalIp()}:${port}${apiPath("pairingQr")}`);
  if (extraQuiet < 2) {
    console.log(
      `  This terminal is ${columns} columns wide; a reliable quiet zone needs ` +
        `${qrTerminalColumns(matrix, 4)}.\n  Widen it, open the page above, or type Server/Token manually.`,
    );
  }
  console.log("");
}

await loadPrompts();

export default {
  port,
  fetch: app.fetch,
  websocket,
};
