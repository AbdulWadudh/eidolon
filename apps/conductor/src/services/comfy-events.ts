import { getServicesConfig } from "@eidolon/config/server";

export interface PromptProgress {
  value: number;
  max: number;
}

export interface PromptWatcher {
  onProgress?: (progress: PromptProgress) => void;
  onPreview?: (dataUri: string) => void;
  onFailed?: (reason: string) => void;
  onFinished?: () => void;
}

const COMFYUI_URL = getServicesConfig().comfyUiUrl;
const PREVIEW_HEADER_BYTES = 8;
const JPEG_FORMAT = 1;

export const COMFY_CLIENT_ID = crypto.randomUUID();

const watchers = new Map<string, PromptWatcher>();

let socket: WebSocket | null = null;
let connecting: Promise<void> | null = null;
let executingPromptId: string | null = null;

function socketUrl(): string {
  return `${COMFYUI_URL.replace(/^http/, "ws")}/ws?clientId=${COMFY_CLIENT_ID}`;
}

function handleText(raw: string): void {
  const message = JSON.parse(raw) as { type: string; data?: Record<string, unknown> };
  const promptId = message.data?.prompt_id;
  if (typeof promptId !== "string") return;

  if (message.type === "executing" || message.type === "execution_start") {
    executingPromptId = promptId;
  }

  const watcher = watchers.get(promptId);
  if (!watcher) return;

  if (message.type === "progress") {
    const value = Number(message.data?.value ?? 0);
    const max = Number(message.data?.max ?? 0);
    if (max > 0) watcher.onProgress?.({ value, max });
    return;
  }

  if (message.type === "execution_error" || message.type === "execution_interrupted") {
    watchers.delete(promptId);
    watcher.onFailed?.(String(message.data?.exception_message ?? message.type));
    return;
  }

  if (message.type === "execution_success") {
    watcher.onFinished?.();
  }
}

// Preview frames carry no prompt id. They are an eight byte header — event type
// then image format — followed by the bytes, and they belong to whichever prompt
// last said it was executing.
function handleBinary(buffer: ArrayBuffer): void {
  if (!executingPromptId || buffer.byteLength <= PREVIEW_HEADER_BYTES) return;

  const watcher = watchers.get(executingPromptId);
  if (!watcher?.onPreview) return;

  const view = new DataView(buffer);
  const format = view.getUint32(4) === JPEG_FORMAT ? "jpeg" : "png";
  const bytes = new Uint8Array(buffer, PREVIEW_HEADER_BYTES);
  watcher.onPreview(`data:image/${format};base64,${Buffer.from(bytes).toString("base64")}`);
}

export async function connectComfyEvents(): Promise<void> {
  if (socket?.readyState === WebSocket.OPEN) return;
  if (connecting) return connecting;

  connecting = new Promise<void>((resolve) => {
    const next = new WebSocket(socketUrl());
    next.binaryType = "arraybuffer";

    next.onopen = () => {
      socket = next;
      connecting = null;
      resolve();
    };
    next.onmessage = (event) => {
      try {
        if (typeof event.data === "string") handleText(event.data);
        else handleBinary(event.data as ArrayBuffer);
      } catch (error) {
        console.error("[comfy-events] bad frame", error);
      }
    };
    next.onclose = () => {
      if (socket === next) socket = null;
      connecting = null;
      resolve();
    };
    next.onerror = () => {
      if (socket === next) socket = null;
      connecting = null;
      resolve();
    };
  });

  return connecting;
}

export function watchPrompt(promptId: string, watcher: PromptWatcher): () => void {
  watchers.set(promptId, watcher);
  return () => watchers.delete(promptId);
}
