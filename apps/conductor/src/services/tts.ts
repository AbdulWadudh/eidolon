import { TTS } from "@eidolon/config";
import { getServicesConfig } from "@eidolon/config/server";
import { stripInfluence } from "@eidolon/protocol";

export function ttsApiUrl(): string {
  return getServicesConfig().ttsApiUrl;
}

export function speakableText(reply: string): string {
  return stripInfluence(reply)
    .replace(/\*[^*]*\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TTS.maxChars);
}

export async function synthesizeSpeech(
  reply: string,
  voice: string = TTS.voice,
  signal?: AbortSignal,
): Promise<string | null> {
  const base = ttsApiUrl();
  const input = speakableText(reply);
  if (!base || input.length === 0) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TTS.timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const response = await fetch(`${base}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "kokoro",
        input,
        voice,
        response_format: TTS.format,
        speed: TTS.speed,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.byteLength > 0 ? Buffer.from(bytes).toString("base64") : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkTtsHealth(): Promise<boolean> {
  const base = ttsApiUrl();
  if (!base) return false;
  try {
    const response = await fetch(`${base.replace(/\/v1$/, "")}/health`, {
      signal: AbortSignal.timeout(TTS.timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}
