import { API_ROUTES, API_VERSION } from "@eidolon/config";
import { getServerConfig, SQLITE_DB_PATH } from "@eidolon/config/server";
import { COLORS } from "@eidolon/tokens";
import { Hono } from "hono";
import { generatePairingPayload, getLocalIp, PAIRING_SECRET, validateToken } from "@/auth";
import { checkDatabaseHealth } from "@/db";
import { renderPairingPage } from "@/pairing/page";
import { checkComfyHealth } from "@/services/comfyui";
import { checkLanceDbHealth } from "@/services/lancedb";
import { checkLlmHealth } from "@/services/llm";
import { getStorageConfig, isStorageConnected } from "@/services/storage";
import { getConnectedDeviceCount, setupWebSocketRoutes } from "@/ws";

export const v1 = new Hono();

export async function buildHealthReport() {
  const [sqliteOk, lancedbOk, llmOk, comfyOk] = await Promise.all([
    Promise.resolve(checkDatabaseHealth()),
    checkLanceDbHealth(),
    checkLlmHealth(),
    checkComfyHealth(),
  ]);

  const storage = getStorageConfig();

  return {
    status: "ok",
    service: "eidolon-conductor",
    version: API_VERSION,
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
    databaseLocation: SQLITE_DB_PATH,
    themeAccent: COLORS.accentAmber,
  };
}

v1.get(API_ROUTES.health, async (c) => c.json(await buildHealthReport()));

v1.get(API_ROUTES.pairing, (c) => {
  const { port } = getServerConfig();

  return c.json({
    pairing_url: generatePairingPayload(port),
    secret: PAIRING_SECRET,
    server: `${getLocalIp()}:${port}`,
  });
});

v1.get(API_ROUTES.pairVerify, (c) => {
  const token = c.req.header("Authorization") ?? c.req.query("token");

  if (!validateToken(token)) {
    return c.json({ ok: false, error: "Invalid pairing token." }, 401);
  }

  return c.json({
    ok: true,
    service: "eidolon-conductor",
    version: API_VERSION,
    server: `${getLocalIp()}:${getServerConfig().port}`,
  });
});

v1.get(API_ROUTES.pairingQr, (c) => {
  const { port } = getServerConfig();
  const payload = generatePairingPayload(port);

  return c.html(renderPairingPage(payload, `${getLocalIp()}:${port}`, PAIRING_SECRET));
});

v1.get(API_ROUTES.pairingStatus, (c) => c.json({ devices: getConnectedDeviceCount() }));

setupWebSocketRoutes(v1);
