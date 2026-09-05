import { getServicesConfig } from "@eidolon/config/server";

export interface PromptProgress {
  value: number;
  max: number;
}

export interface PromptWatcher {
  onProgress?: (progress: PromptProgress) => void;
  onFailed?: (reason: string) => void;
  onFinished?: () => void;
}

const COMFYUI_URL = getServicesConfig().comfyUiUrl;

export const COMFY_CLIENT_ID = crypto.randomUUID();

const watchers = new Map<string, PromptWatcher>();

let socket: WebSocket | null = null;
let connecting: Promise<void> | null = null;

function socketUrl(): string {
  return `${COMFYUI_URL.replace(/^http/, "ws")}/ws?clientId=${COMFY_CLIENT_ID}`;
}

function handle(raw: string): void {
  const message = JSON.parse(raw) as { type: string; data?: Record<string, unknown> };
  const promptId = message.data?.prompt_id;
  if (typeof promptId !== "string") return;

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
    watchers.delete(promptId);
    watcher.onFinished?.();
  }
}

export async function connectComfyEvents(): Promise<void> {
  if (socket?.readyState === WebSocket.OPEN) return;
  if (connecting) return connecting;

  connecting = new Promise<void>((resolve) => {
    const next = new WebSocket(socketUrl());

    next.onopen = () => {
      socket = next;
      connecting = null;
      resolve();
    };
    next.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        handle(event.data);
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
