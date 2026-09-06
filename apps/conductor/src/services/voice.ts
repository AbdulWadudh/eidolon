import { KOKORO, SILENT_MP3, silentMp3FrameCount, TTS } from "@eidolon/config";
import { ttsApiUrl } from "@/services/tts";
import { speakableSentence } from "@/utils/sentence-buffer";

let reportedOffline = false;

export function silentMp3(): Buffer {
  const frames = silentMp3FrameCount();
  const buffer = Buffer.alloc(frames * SILENT_MP3.frameBytes);

  for (let frame = 0; frame < frames; frame += 1) {
    const offset = frame * SILENT_MP3.frameBytes;
    for (let byte = 0; byte < SILENT_MP3.frameHeader.length; byte += 1) {
      buffer[offset + byte] = SILENT_MP3.frameHeader[byte] ?? 0;
    }
  }

  return buffer;
}

function reportOffline(reason: string): Buffer {
  if (!reportedOffline) {
    reportedOffline = true;
    console.warn(`[voice] Kokoro is not answering at ${ttsApiUrl() || "<unset>"}: ${reason}`);
    console.warn("[voice] Sentences will stream as silence until a voice node is running.");
  }
  return silentMp3();
}

export async function synthesizeSentence(
  text: string,
  voiceId?: string,
  signal?: AbortSignal,
): Promise<Buffer> {
  const input = speakableSentence(text).slice(0, KOKORO.maxSentenceChars);
  if (input.length === 0) return Buffer.alloc(0);

  const base = ttsApiUrl();
  if (!base) return reportOffline("no TTS endpoint is configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KOKORO.timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const response = await fetch(`${base}${KOKORO.speechPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: KOKORO.model,
        input,
        voice: voiceId || KOKORO.defaultVoice,
        response_format: KOKORO.responseFormat,
        speed: TTS.speed,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return reportOffline(`HTTP ${response.status}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) return reportOffline("an empty body came back");

    reportedOffline = false;
    return Buffer.from(bytes);
  } catch (error) {
    if (signal?.aborted) return Buffer.alloc(0);
    return reportOffline(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeout);
  }
}

export function concatMp3(parts: Buffer[]): Buffer {
  return parts.length === 0 ? Buffer.alloc(0) : Buffer.concat(parts);
}
