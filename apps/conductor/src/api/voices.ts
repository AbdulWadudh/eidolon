import { API_ROUTES, VOICE } from "@eidolon/config";
import { Hono } from "hono";
import { synthesizeSpeech } from "@/services/tts";
import { listVoices } from "@/services/voices";

export const voices = new Hono();

voices.get("/", async (c) => {
  const catalogue = await listVoices();
  return c.json({ voices: catalogue, defaultVoice: VOICE.defaultId });
});

voices.get("/:id/preview", async (c) => {
  const audio = await synthesizeSpeech(VOICE.previewLine, c.req.param("id"));
  if (!audio) return c.json({ error: "The voice service is not reachable." }, 503);

  return c.json({ voice: c.req.param("id"), format: "mp3", data: audio });
});

export function mountVoices(app: Hono): void {
  app.route(API_ROUTES.voices, voices);
}
