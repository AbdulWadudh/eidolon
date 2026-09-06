import { TIMEOUTS_MS, TRANSCRIBE } from "@eidolon/config";
import { getServicesConfig } from "@eidolon/config/server";

export function sttApiUrl(): string {
  return getServicesConfig().sttApiUrl;
}

export function isTranscriptionConfigured(): boolean {
  return sttApiUrl().length > 0;
}

export function cleanTranscript(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, TRANSCRIBE.maxChars);
}

interface TranscriptionBody {
  text?: unknown;
}

export async function transcribeAudio(
  audio: Buffer | Uint8Array,
  mimeType: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const base = sttApiUrl();
  if (!base || audio.byteLength === 0) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIBE.timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const form = new FormData();
    form.append(
      TRANSCRIBE.formField,
      new File([new Uint8Array(audio)], TRANSCRIBE.filename, { type: mimeType }),
    );
    form.append("model", TRANSCRIBE.model);
    form.append("language", TRANSCRIBE.language);
    form.append("response_format", TRANSCRIBE.responseFormat);

    const response = await fetch(`${base}${TRANSCRIBE.path}`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[transcribe] ${base} answered ${response.status}`);
      return null;
    }

    const body = (await response.json()) as TranscriptionBody;
    if (typeof body.text !== "string") return null;

    const text = cleanTranscript(body.text);
    return text.length > 0 ? text : null;
  } catch (error) {
    if (signal?.aborted) return null;
    console.warn(
      `[transcribe] ${base} is not answering: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkTranscribeHealth(): Promise<boolean> {
  const base = sttApiUrl();
  if (!base) return false;

  try {
    const response = await fetch(`${base.replace(/\/v1$/, "")}/health`, {
      signal: AbortSignal.timeout(TIMEOUTS_MS.serviceHealth),
    });
    return response.ok;
  } catch {
    return false;
  }
}
