import { COLORS } from "@eidolon/tokens";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import qrcode from "qrcode-terminal";
import { generatePairingPayload, getLocalIp, PAIRING_SECRET } from "./auth";
import { checkDatabaseHealth } from "./db";
import { checkComfyHealth } from "./services/comfyui";
import { checkLanceDbHealth } from "./services/lancedb";
import { checkLlmHealth } from "./services/llm";
import { setupWebSocketRoutes, websocket } from "./ws";

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

// Mount WebSocket route
setupWebSocketRoutes(app);

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
const pairingPayload = generatePairingPayload(port);

// Boot banner (suppressed in test environment)
if (process.env.NODE_ENV !== "test") {
  console.log("\n========================================");
  console.log("  EIDOLON CONDUCTOR GATEWAY ACTIVE");
  console.log(`  Listening on: http://${host}:${port}`);
  console.log(`  Pairing: ${pairingPayload}`);
  console.log("========================================\n");
  qrcode.generate(pairingPayload, { small: true });
}

export default {
  port,
  fetch: app.fetch,
  websocket,
};
