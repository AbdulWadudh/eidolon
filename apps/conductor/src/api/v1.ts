import { API_ROUTES, API_VERSION, TRANSCRIPT } from "@eidolon/config";
import { getServerConfig, SQLITE_DB_PATH } from "@eidolon/config/server";
import { COLORS } from "@eidolon/tokens";
import { Hono } from "hono";
import { generatePairingPayload, getLocalIp, PAIRING_SECRET, validateToken } from "@/auth";
import {
  checkDatabaseHealth,
  deleteMessage,
  forgetCharacter,
  getCharacterCard,
  getCharacterMind,
  getTranscript,
} from "@/db";
import {
  getCharacterLook,
  setCharacterAvatar,
  setCharacterAvatarCrop,
  setCharacterBackground,
  setCharacterFace,
} from "@/db/look";
import { renderPairingPage } from "@/pairing/page";
import { describePrompt, listPrompts, resetPrompt, setPrompt } from "@/prompts/store";
import { checkCacheHealth } from "@/services/cache";
import { checkComfyHealth } from "@/services/comfyui";
import { checkLanceDbHealth } from "@/services/lancedb";
import { checkLlmHealth } from "@/services/llm";
import { forgetFace } from "@/services/selfie";
import { getStorageConfig, isStorageConnected } from "@/services/storage";
import { checkTtsHealth } from "@/services/tts";
import { getConnectedDeviceCount, setupWebSocketRoutes } from "@/ws";

export const v1 = new Hono();

export async function buildHealthReport() {
  const [sqliteOk, lancedbOk, llmOk, comfyOk, cacheOk, ttsOk] = await Promise.all([
    Promise.resolve(checkDatabaseHealth()),
    checkLanceDbHealth(),
    checkLlmHealth(),
    checkComfyHealth(),
    checkCacheHealth(),
    checkTtsHealth(),
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
      cache: cacheOk ? "healthy" : "offline",
      tts: ttsOk ? "healthy" : "offline",
    },
    storage: {
      type: "s3",
      endpoint: storage.endpoint,
      bucket: storage.bucket,
      status: isStorageConnected() ? "connected" : "offline",
    },
    webSearch: {
      primary: "duck-duck-scrape",
      hasSerperFallback: !!process.env.SERPER_API_KEY,
      hasExaFallback: !!process.env.EXA_API_KEY,
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

v1.get(API_ROUTES.prompts, (c) => c.json({ prompts: listPrompts() }));

v1.get(`${API_ROUTES.prompts}/:key`, (c) => {
  const record = describePrompt(c.req.param("key"));
  if (record.description.length === 0) return c.json({ error: "Unknown prompt key." }, 404);
  return c.json(record);
});

v1.put(`${API_ROUTES.prompts}/:key`, async (c) => {
  const body = (await c.req.json().catch(() => null)) as { value?: unknown } | null;
  if (typeof body?.value !== "string") {
    return c.json({ error: "Body must be { value: string }." }, 400);
  }

  try {
    return c.json(await setPrompt(c.req.param("key"), body.value));
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Invalid prompt." }, 400);
  }
});

v1.delete(`${API_ROUTES.prompts}/:key`, async (c) => {
  try {
    return c.json(await resetPrompt(c.req.param("key")));
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Invalid prompt." }, 400);
  }
});

v1.get(`${API_ROUTES.characters}/:id/messages`, (c) => {
  const characterId = c.req.param("id");
  const card = getCharacterCard(characterId);
  const mind = getCharacterMind(characterId);

  return c.json({
    character: { id: characterId, name: card.name, ...mind, ...getCharacterLook(characterId) },
    messages: getTranscript(characterId, TRANSCRIPT.pageSize),
  });
});

v1.delete(`${API_ROUTES.characters}/:id/messages/:messageId`, (c) => {
  deleteMessage(c.req.param("messageId"));
  return c.json({ ok: true });
});

v1.patch(`${API_ROUTES.characters}/:id/look`, async (c) => {
  const characterId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as {
    avatarUrl?: string | null;
    avatarCrop?: unknown;
    backgroundUrl?: string | null;
    faceUrl?: string | null;
  };

  if (typeof body.avatarUrl === "string" && body.avatarUrl.length > 0) {
    setCharacterAvatar(characterId, body.avatarUrl);
    forgetFace(characterId);
  }
  if (body.avatarCrop !== undefined) {
    setCharacterAvatarCrop(characterId, body.avatarCrop ?? null);
  }
  if (body.faceUrl !== undefined) {
    setCharacterFace(characterId, body.faceUrl || null);
    forgetFace(characterId);
  }
  if (body.backgroundUrl !== undefined) {
    setCharacterBackground(characterId, body.backgroundUrl || null);
  }

  return c.json({ character: { id: characterId, ...getCharacterLook(characterId) } });
});

v1.delete(`${API_ROUTES.characters}/:id/memory`, (c) => {
  const characterId = c.req.param("id");
  forgetCharacter(characterId);
  const mind = getCharacterMind(characterId);

  return c.json({ character: { id: characterId, ...mind }, messages: [] });
});
