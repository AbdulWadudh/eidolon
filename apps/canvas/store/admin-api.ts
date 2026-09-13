import { type AdminApiRoute, adminApiPath, stripAuthority, TIMEOUTS_MS } from "@eidolon/config";
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
