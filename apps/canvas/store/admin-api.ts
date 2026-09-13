import {
  type AdminApiRoute,
  adminApiPath,
  adminConfigReloadPath,
  adminPromptAuthorPath,
  stripAuthority,
  TIMEOUTS_MS,
} from "@eidolon/config";
import type { ConfigBucket } from "@eidolon/config/registry";
import type {
  AdminAccount,
  AdminCharacter,
  AdminPrompt,
  AdminThemeView,
  ThemeTokenPatch,
  UserRole,
} from "@eidolon/protocol";

export type { AdminAccount, AdminCharacter, AdminPrompt, AdminThemeView };

export class AdminRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
  }
}

function httpBase(host: string): string {
  return host.startsWith("http") ? host.replace(/\/+$/, "") : `http://${stripAuthority(host)}`;
}

async function request<T>(
  host: string,
  token: string,
  route: AdminApiRoute,
  options: { id?: string; method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${httpBase(host)}${adminApiPath(route, options.id)}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : "";
    throw new AdminRequestError(response.status, message);
  }

  return body as T;
}

export function fetchPrompts(host: string, token: string): Promise<{ prompts: AdminPrompt[] }> {
  return request(host, token, "prompts");
}

export function savePrompt(
  host: string,
  token: string,
  key: string,
  value: string,
): Promise<{ prompt: AdminPrompt }> {
  return request(host, token, "prompts", { id: key, method: "PUT", body: { value } });
}

export function resetPrompt(
  host: string,
  token: string,
  key: string,
): Promise<{ prompt: AdminPrompt }> {
  return request(host, token, "prompts", { id: key, method: "DELETE" });
}

export function fetchAdminCharacters(
  host: string,
  token: string,
): Promise<{ characters: AdminCharacter[] }> {
  return request(host, token, "characters");
}

export function saveCharacter(
  host: string,
  token: string,
  id: string,
  patch: Partial<AdminCharacter>,
): Promise<{ character: AdminCharacter }> {
  return request(host, token, "characters", { id, method: "PATCH", body: patch });
}

export function createCharacter(
  host: string,
  token: string,
  name: string,
): Promise<{ character: AdminCharacter }> {
  return request(host, token, "characters", { method: "POST", body: { name } });
}

export function removeCharacter(host: string, token: string, id: string): Promise<{ ok: true }> {
  return request(host, token, "characters", { id, method: "DELETE" });
}

export function fetchAccounts(host: string, token: string): Promise<{ accounts: AdminAccount[] }> {
  return request(host, token, "users");
}

export function saveAccount(
  host: string,
  token: string,
  id: string,
  patch: { role?: UserRole; name?: string },
): Promise<{ account: AdminAccount }> {
  return request(host, token, "users", { id, method: "PATCH", body: patch });
}

export function removeAccount(host: string, token: string, id: string): Promise<{ ok: true }> {
  return request(host, token, "users", { id, method: "DELETE" });
}

export function fetchTheme(host: string, token: string): Promise<AdminThemeView> {
  return request(host, token, "theme");
}

export function saveTheme(
  host: string,
  token: string,
  patch: ThemeTokenPatch,
): Promise<AdminThemeView> {
  return request(host, token, "theme", { method: "PATCH", body: patch });
}

export function resetThemeToken(
  host: string,
  token: string,
  tokenName: string,
): Promise<AdminThemeView> {
  return request(host, token, "theme", { id: tokenName, method: "DELETE" });
}

export function resetTheme(host: string, token: string): Promise<AdminThemeView> {
  return request(host, token, "theme", { method: "DELETE" });
}

export interface ConfigSetting {
  path: string;
  group: string;
  source: string;
  bucket: ConfigBucket;
  reason: string;
  boundTo: string | null;
  kind: "string" | "number" | "boolean" | "list" | "object";
  secret: boolean;
  shipped: unknown;
  value: unknown;
  isOverridden: boolean;
}

export interface ConfigView {
  generation: number;
  overridden: number;
  buckets: { bucket: ConfigBucket; label: string; blurb: string; count: number }[];
  settings: ConfigSetting[];
}

export function fetchConfig(host: string, token: string): Promise<ConfigView> {
  return request(host, token, "config");
}

export function saveConfigValue(
  host: string,
  token: string,
  path: string,
  value: unknown,
): Promise<{ setting: ConfigSetting }> {
  return request(host, token, "config", { id: path, method: "PUT", body: { value } });
}

export function resetConfigValue(
  host: string,
  token: string,
  path: string,
): Promise<{ setting: ConfigSetting }> {
  return request(host, token, "config", { id: path, method: "DELETE" });
}

export async function reloadConfig(host: string, token: string): Promise<ConfigView> {
  const response = await fetch(`${httpBase(host)}${adminConfigReloadPath()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new AdminRequestError(response.status, typeof body?.error === "string" ? body.error : "");
  }

  return body as unknown as ConfigView;
}

export interface PromptAuthorResult {
  text: string | null;
  error: string | null;
}

export async function authorPrompt(
  host: string,
  token: string,
  key: string,
  mode: "suggest" | "enhance",
  draft: string,
): Promise<PromptAuthorResult> {
  if (!host) return { text: null, error: null };

  try {
    const response = await fetch(`${httpBase(host)}${adminPromptAuthorPath(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, draft }),
      signal: AbortSignal.timeout(TIMEOUTS_MS.generation),
    });

    const body = (await response.json().catch(() => null)) as {
      text?: string;
      error?: string;
    } | null;

    if (!response.ok) return { text: null, error: body?.error ?? null };
    return { text: body?.text ?? null, error: null };
  } catch {
    return { text: null, error: null };
  }
}
