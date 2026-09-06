import { IMAGE, TIMEOUTS_MS } from "@eidolon/config";
import { getServicesConfig } from "@eidolon/config/server";
import { delay } from "es-toolkit";
import {
  COMFY_CLIENT_ID,
  connectComfyEvents,
  type PromptProgress,
  watchPrompt,
} from "@/services/comfy-events";
import { buildImageWorkflow, type Orientation } from "@/services/comfy-workflow";

export const COMFYUI_URL = getServicesConfig().comfyUiUrl;

export interface QueuePromptResponse {
  prompt_id: string;
  number?: number;
  node_errors?: Record<string, unknown>;
}

export interface GeneratedImage {
  bytes: Uint8Array;
  filename: string;
  seed: number;
}

interface HistoryOutput {
  images?: { filename: string; subfolder: string; type: string }[];
}

interface HistoryEntry {
  outputs?: Record<string, HistoryOutput>;
  status?: { completed?: boolean; status_str?: string };
}

export class ComfyUnavailableError extends Error {}
export class ComfyGenerationError extends Error {}

export async function checkComfyHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUTS_MS.serviceHealth);

    const res = await fetch(`${COMFYUI_URL}/system_stats`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function uploadFaceReference(bytes: Uint8Array, name: string): Promise<string> {
  const form = new FormData();
  form.append("image", new Blob([bytes as BlobPart], { type: "image/png" }), name);
  form.append("overwrite", "true");

  const res = await fetch(`${COMFYUI_URL}/upload/image`, { method: "POST", body: form });
  if (!res.ok) throw new ComfyUnavailableError(`upload failed with ${res.status}`);

  const body = (await res.json()) as { name: string; subfolder?: string };
  return body.subfolder ? `${body.subfolder}/${body.name}` : body.name;
}

async function queuePrompt(graph: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: graph, client_id: COMFY_CLIENT_ID }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new ComfyGenerationError(`ComfyUI rejected the workflow (${res.status}): ${detail}`);
  }

  const body = (await res.json()) as QueuePromptResponse;
  if (!body.prompt_id) throw new ComfyGenerationError("ComfyUI returned no prompt id");
  return body.prompt_id;
}

async function readHistory(promptId: string): Promise<HistoryEntry | null> {
  const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
  if (!res.ok) return null;
  const body = (await res.json()) as Record<string, HistoryEntry>;
  return body[promptId] ?? null;
}

function firstImage(entry: HistoryEntry): { filename: string; subfolder: string; type: string } {
  for (const output of Object.values(entry.outputs ?? {})) {
    const image = output.images?.[0];
    if (image) return image;
  }
  throw new ComfyGenerationError("the workflow produced no image");
}

async function fetchImage(image: { filename: string; subfolder: string; type: string }) {
  const query = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder,
    type: image.type,
  });
  const res = await fetch(`${COMFYUI_URL}/view?${query}`);
  if (!res.ok) throw new ComfyGenerationError(`could not read the image (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

export interface GenerateOptions {
  orientation?: Orientation;
  onProgress?: (progress: PromptProgress) => void;
  onPreview?: (dataUri: string) => void;
  signal?: AbortSignal;
}

export async function generateImage(
  prompt: string,
  faceImageName: string | null,
  options: GenerateOptions = {},
): Promise<GeneratedImage> {
  if (!(await checkComfyHealth())) {
    throw new ComfyUnavailableError(`ComfyUI is not reachable at ${COMFYUI_URL}`);
  }

  await connectComfyEvents();

  const seed = Math.floor(Math.random() * 1_000_000_000);
  const promptId = await queuePrompt(
    buildImageWorkflow({
      prompt,
      seed,
      faceImageName,
      orientation: options.orientation ?? "portrait",
    }),
  );

  let failure: string | null = null;
  let finished = false;
  const unwatch = watchPrompt(promptId, {
    onProgress: options.onProgress,
    onPreview: options.onPreview,
    onFinished: () => {
      finished = true;
    },
    onFailed: (reason) => {
      failure = reason;
    },
  });

  try {
    const deadline = Date.now() + IMAGE.maxPollMs;
    while (Date.now() < deadline) {
      if (options.signal?.aborted) throw new ComfyGenerationError("generation was cancelled");
      if (failure) throw new ComfyGenerationError(failure);

      const entry = await readHistory(promptId);
      if (entry?.status?.completed || (finished && entry?.outputs)) {
        const image = firstImage(entry as HistoryEntry);
        return { bytes: await fetchImage(image), filename: image.filename, seed };
      }
      if (entry?.status?.status_str === "error") {
        throw new ComfyGenerationError("ComfyUI reported an execution error");
      }

      await delay(IMAGE.pollIntervalMs);
    }
  } finally {
    unwatch();
  }

  throw new ComfyGenerationError("timed out waiting for the image");
}
