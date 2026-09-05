import { COLORS } from "@eidolon/tokens";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { generatePairingPayload, getLocalIp, PAIRING_SECRET, validateToken } from "@/auth";
import { checkDatabaseHealth } from "@/db";
import {
  buildQrMatrix,
  qrTerminalColumns,
  renderPairingPage,
  renderQrTerminal,
} from "@/pairing/qr";
import { checkComfyHealth } from "@/services/comfyui";
import { checkLanceDbHealth } from "@/services/lancedb";
import { checkLlmHealth } from "@/services/llm";
import { getStorageConfig, initStorage, isStorageConnected } from "@/services/storage";
import { SQLITE_DB_PATH } from "@/utils/paths";
import { setupWebSocketRoutes, websocket } from "@/ws";

export const app = new Hono();

// Global Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

// Health Endpoint
app.get("/health", async (c) => {
  const [sqliteOk, lancedbOk, llmOk, comfyOk] = await Promise.all([
    Promise.resolve(checkDatabaseHealth()),
    checkLanceDbHealth(),
    checkLlmHealth(),
    checkComfyHealth(),
  ]);

  const storage = getStorageConfig();

  return c.json({
    status: "ok",
    service: "eidolon-conductor",
    uptime: process.uptime(),
    timestamp: Date.now(),
    services: {
      sqlite: sqliteOk ? "healthy" : "unhealthy",
      lancedb: lancedbOk ? "healthy" : "unhealthy",
      llm: llmOk ? "healthy" : "offline",
      comfyui: comfyOk ? "healthy" : "offline",
    },
    storage: {
      type: "s3",
      endpoint: storage.endpoint,
      bucket: storage.bucket,
      status: isStorageConnected() ? "connected" : "offline",
    },
    // Surfaced so the operator can find the databases without knowing the
    // per-OS convention - they are deliberately outside the checkout.
    databaseLocation: SQLITE_DB_PATH,
    themeAccent: COLORS.accentAmber,
  });
});

// Pairing API Endpoint
app.get("/api/pairing", (c) => {
  const port = Number(process.env.PORT) || 3000;
  const payload = generatePairingPayload(port);
  return c.json({
    pairing_url: payload,
    secret: PAIRING_SECRET,
    server: `${getLocalIp()}:${port}`,
  });
});

/**
 * Confirms a scanned or typed pairing token before the client stores it.
 *
 * /health is deliberately unauthenticated so it stays usable for monitoring,
 * which meant pairing only ever proved the host was reachable - any token at
 * all "paired" successfully and then failed later at the WebSocket upgrade with
 * no explanation. This endpoint is the one the client checks.
 */
app.get("/api/pair/verify", (c) => {
  const token = c.req.header("Authorization") ?? c.req.query("token");

  if (!validateToken(token)) {
    return c.json({ ok: false, error: "Invalid pairing token." }, 401);
  }

  return c.json({
    ok: true,
    service: "eidolon-conductor",
    server: `${getLocalIp()}:${Number(process.env.PORT) || 3000}`,
  });
});

/**
 * Browser-rendered pairing code, always with a correct quiet zone.
 */
app.get("/api/pairing/qr", (c) => {
  const pairingPort = Number(process.env.PORT) || 3000;
  const payload = generatePairingPayload(pairingPort);
  return c.html(renderPairingPage(payload, `${getLocalIp()}:${pairingPort}`, PAIRING_SECRET));
});

// Mount WebSocket route
setupWebSocketRoutes(app);

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
const pairingPayload = generatePairingPayload(port);

// Reaching the bucket is a network round trip, so it is kept out of the test
// run: `bun test` imports this module and would otherwise hit the configured
// bucket on every invocation. Failure is logged and non-fatal - media degrades, the
// gateway keeps serving pairing and chat.
if (process.env.NODE_ENV !== "test") {
  void initStorage();
}

// Boot banner (suppressed in test environment)
if (process.env.NODE_ENV !== "test") {
  console.log("\n========================================");
  console.log("  EIDOLON CONDUCTOR GATEWAY ACTIVE");
  console.log(`  Listening on: http://${host}:${port}`);
  console.log(`  Server:  ${getLocalIp()}:${port}`);
  console.log(`  Token:   ${PAIRING_SECRET}`);
  console.log(`  Pairing: ${pairingPayload}`);
  console.log("========================================\n");
  const matrix = buildQrMatrix(pairingPayload);
  const columns = process.stdout.columns ?? 80;
  // Fit as much quiet zone as the terminal allows: scanners need margin, but a
  // wrapped code is worse than a tight one.
  const extraQuiet = Math.max(
    0,
    Math.min(4, Math.floor((columns - qrTerminalColumns(matrix)) / 4)),
  );

  console.log(renderQrTerminal(matrix, extraQuiet));
  console.log(`\n  Scannable page: http://${getLocalIp()}:${port}/api/pairing/qr`);
  if (extraQuiet < 2) {
    console.log(
      `  This terminal is ${columns} columns wide; a reliable quiet zone needs ` +
        `${qrTerminalColumns(matrix, 4)}.\n  Widen it, open the page above, or type Server/Token manually.`,
    );
  }
  console.log("");
}

export default {
  port,
  fetch: app.fetch,
  websocket,
};
