import { healthUrl, TIMEOUTS_MS } from "@eidolon/config";
import * as React from "react";

export type ServiceName = "sqlite" | "lancedb" | "llm" | "comfyui" | "cache" | "tts" | "stt";

interface HealthBody {
  services?: Record<string, unknown>;
}

export async function fetchServices(host: string): Promise<Record<string, string>> {
  if (!host) return {};

  try {
    const response = await fetch(healthUrl(host), {
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!response.ok) return {};

    const body = (await response.json()) as HealthBody;
    const services = body.services ?? {};
    const readable: Record<string, string> = {};

    for (const [name, state] of Object.entries(services)) {
      if (typeof state === "string") readable[name] = state;
    }

    return readable;
  } catch {
    return {};
  }
}

export function isUsable(state: string | undefined): boolean {
  return state === "healthy";
}

export function useServerCapability(host: string, service: ServiceName): boolean {
  const [usable, setUsable] = React.useState(false);

  React.useEffect(() => {
    let live = true;

    void fetchServices(host).then((services) => {
      if (live) setUsable(isUsable(services[service]));
    });

    return () => {
      live = false;
    };
  }, [host, service]);

  return usable;
}

interface ThinkingBody {
  llm?: { canThink?: unknown };
}

export async function fetchCanThink(host: string): Promise<boolean> {
  if (!host) return false;

  try {
    const response = await fetch(healthUrl(host), {
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!response.ok) return false;

    const body = (await response.json()) as ThinkingBody;
    return body.llm?.canThink === true;
  } catch {
    return false;
  }
}

export function useCanThink(host: string): boolean {
  const [capable, setCapable] = React.useState(false);

  React.useEffect(() => {
    let live = true;

    void fetchCanThink(host).then((next) => {
      if (live) setCapable(next);
    });

    return () => {
      live = false;
    };
  }, [host]);

  return capable;
}
