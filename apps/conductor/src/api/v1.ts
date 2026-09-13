import { API_ROUTES, API_VERSION } from "@eidolon/config";
import { SQLITE_DB_PATH } from "@eidolon/config/server";
import { COLORS } from "@eidolon/tokens";
import { Hono } from "hono";
import { mountCharacters } from "@/api/characters";
import { readLoreBody } from "@/api/lore-body";
import { applyAffinityOverride, buildMindView } from "@/api/mind";
import { mountVoices } from "@/api/voices";
import { accountFor, requireOwner, requireUser, type UserEnv } from "@/auth/guard";
import { AFFINITY, TRANSCRIPT } from "@/config";
import {
  appendMessage,
  checkDatabaseHealth,
  deleteMessage,
  forgetCharacter,
  getCharacterCard,
  getCharacterMind,
  getTranscript,
  updateMessageContent,
} from "@/db";
import { getCharacter } from "@/db/characters";
import {
  appendChronicle,
  deleteChronicle,
  nextChapterIndex,
  updateChronicle,
} from "@/db/chronicles";
import {
  getCharacterLook,
  setCharacterAvatar,
  setCharacterAvatarCrop,
  setCharacterBackground,
  setCharacterFace,
  setCharacterOutfit,
} from "@/db/look";
import { deleteLoreEntry, upsertLoreEntry } from "@/db/lorebook";
import { summarizeChronicleNow } from "@/orchestrator/chronicle";
import { resolveMood } from "@/orchestrator/prompt-builder";
import { describePrompt, listPrompts, resetPrompt, setPrompt } from "@/prompts/store";
import { checkCacheHealth } from "@/services/cache";
import { checkComfyHealth } from "@/services/comfyui";
import { checkLanceDbHealth } from "@/services/lancedb";
import { checkLlmHealth } from "@/services/llm";
import { forgetFace } from "@/services/selfie";
import { getStorageConfig, isStorageConnected } from "@/services/storage";
import { checkTranscribeHealth, isTranscriptionConfigured } from "@/services/transcribe";
import { checkTtsHealth } from "@/services/tts";
import { setupWebSocketRoutes } from "@/ws";

export const v1 = new Hono<UserEnv>();

export async function buildHealthReport() {
  const [sqliteOk, lancedbOk, llmOk, comfyOk, cacheOk, ttsOk, sttOk] = await Promise.all([
    Promise.resolve(checkDatabaseHealth()),
    checkLanceDbHealth(),
    checkLlmHealth(),
    checkComfyHealth(),
    checkCacheHealth(),
    checkTtsHealth(),
    checkTranscribeHealth(),
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
      stt: isTranscriptionConfigured() ? (sttOk ? "healthy" : "offline") : "unconfigured",
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

v1.get(API_ROUTES.session, async (c) => c.json({ account: await accountFor(c) }));

setupWebSocketRoutes(v1);

v1.use(`${API_ROUTES.prompts}/*`, requireOwner);
v1.use(API_ROUTES.prompts, requireOwner);

v1.use(API_ROUTES.characters, requireUser);
v1.use(`${API_ROUTES.characters}/*`, requireUser);

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

function openingTranscript(characterId: string, userId: string) {
  const transcript = getTranscript(characterId, userId, TRANSCRIPT.pageSize);
  if (transcript.length > 0) return transcript;

  const greeting = getCharacter(characterId)?.greeting?.trim() ?? "";
  if (greeting.length === 0) return transcript;

  return [
    {
      id: appendMessage(characterId, "assistant", greeting, userId),
      role: "assistant",
      content: greeting,
      audioUrl: null,
      audioDuration: null,
      imageUrl: null,
      createdAt: Date.now(),
    },
  ];
}

v1.get(`${API_ROUTES.characters}/:id/messages`, (c) => {
  const characterId = c.req.param("id");
  const userId = c.get("user").id;
  const card = getCharacterCard(characterId, userId);
  const mind = getCharacterMind(characterId, userId);

  return c.json({
    character: { id: characterId, name: card.name, ...mind, ...getCharacterLook(characterId) },
    messages: openingTranscript(characterId, userId),
  });
});

v1.delete(`${API_ROUTES.characters}/:id/messages/:messageId`, (c) => {
  if (!deleteMessage(c.req.param("messageId"), c.get("user").id)) {
    return c.json({ error: "No such message." }, 404);
  }
  return c.json({ ok: true });
});

v1.patch(`${API_ROUTES.characters}/:id/look`, async (c) => {
  const characterId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as {
    avatarUrl?: string | null;
    avatarCrop?: unknown;
    backgroundUrl?: string | null;
    faceUrl?: string | null;
    outfit?: string | null;
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
  if (body.outfit !== undefined) {
    setCharacterOutfit(characterId, body.outfit?.trim() || null);
  }

  return c.json({ character: { id: characterId, ...getCharacterLook(characterId) } });
});

v1.get(`${API_ROUTES.characters}/:id/mind`, (c) =>
  c.json(buildMindView(c.req.param("id"), c.get("user").id)),
);

v1.patch(`${API_ROUTES.characters}/:id/affinity`, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    score?: unknown;
    locked?: unknown;
    mood?: unknown;
  };

  const score = typeof body.score === "number" ? body.score : undefined;
  const locked = typeof body.locked === "boolean" ? body.locked : undefined;
  const mood = typeof body.mood === "string" ? body.mood : undefined;

  if (score === undefined && locked === undefined && mood === undefined) {
    return c.json({ error: "Body must carry a numeric score, a boolean locked, or a mood." }, 400);
  }

  if (mood !== undefined && !resolveMood(mood)) {
    return c.json({ error: `Unknown mood. Expected one of: ${AFFINITY.moods.join(", ")}.` }, 400);
  }

  return c.json(
    applyAffinityOverride(c.req.param("id"), c.get("user").id, { score, locked, mood }),
  );
});

v1.delete(`${API_ROUTES.characters}/:id/memory`, (c) => {
  const characterId = c.req.param("id");
  const userId = c.get("user").id;
  forgetCharacter(characterId, userId);
  const mind = getCharacterMind(characterId, userId);

  return c.json({ character: { id: characterId, ...mind }, messages: [] });
});

mountCharacters(v1);
mountVoices(v1);

v1.post(`${API_ROUTES.characters}/:id/chronicle/summarize`, async (c) => {
  const characterId = c.req.param("id");
  const userId = c.get("user").id;
  const jobId = await summarizeChronicleNow(characterId, userId);

  if (!jobId) {
    return c.json({ error: "There is nothing said yet to summarise." }, 400);
  }

  return c.json({ ok: true, jobId, mind: buildMindView(characterId, userId) });
});

v1.post(`${API_ROUTES.characters}/:id/chronicle`, async (c) => {
  const characterId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { summaryText?: unknown };

  if (typeof body.summaryText !== "string" || body.summaryText.trim().length === 0) {
    return c.json({ error: "Body must carry a non-empty summaryText." }, 400);
  }

  const userId = c.get("user").id;
  appendChronicle(
    characterId,
    userId,
    nextChapterIndex(characterId, userId),
    body.summaryText.trim(),
  );
  return c.json(buildMindView(characterId, userId));
});

v1.patch(`${API_ROUTES.characters}/:id/chronicle/:chapterId`, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { summaryText?: unknown };

  if (typeof body.summaryText !== "string" || body.summaryText.trim().length === 0) {
    return c.json({ error: "Body must carry a non-empty summaryText." }, 400);
  }

  const userId = c.get("user").id;
  if (!updateChronicle(c.req.param("chapterId"), body.summaryText.trim(), userId)) {
    return c.json({ error: "No such chapter." }, 404);
  }

  return c.json(buildMindView(c.req.param("id"), userId));
});

v1.delete(`${API_ROUTES.characters}/:id/chronicle/:chapterId`, (c) => {
  const userId = c.get("user").id;
  if (!deleteChronicle(c.req.param("chapterId"), userId)) {
    return c.json({ error: "No such chapter." }, 404);
  }

  return c.json(buildMindView(c.req.param("id"), userId));
});

v1.post(`${API_ROUTES.characters}/:id/lore`, async (c) => {
  const characterId = c.req.param("id");
  const entry = await readLoreBody(c);
  if ("error" in entry) return c.json({ error: entry.error }, 400);

  upsertLoreEntry(characterId, entry.value);
  return c.json(buildMindView(characterId, c.get("user").id));
});

v1.patch(`${API_ROUTES.characters}/:id/lore/:entryId`, async (c) => {
  const characterId = c.req.param("id");
  const entry = await readLoreBody(c);
  if ("error" in entry) return c.json({ error: entry.error }, 400);

  upsertLoreEntry(characterId, entry.value, c.req.param("entryId"));
  return c.json(buildMindView(characterId, c.get("user").id));
});

v1.delete(`${API_ROUTES.characters}/:id/lore/:entryId`, (c) => {
  deleteLoreEntry(c.req.param("entryId"));
  return c.json(buildMindView(c.req.param("id"), c.get("user").id));
});

v1.patch(`${API_ROUTES.characters}/:id/messages/:messageId`, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { content?: unknown };

  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    return c.json({ error: "Body must carry non-empty content." }, 400);
  }

  if (!updateMessageContent(c.req.param("messageId"), body.content.trim(), c.get("user").id)) {
    return c.json({ error: "No such message." }, 404);
  }

  return c.json({ ok: true });
});
