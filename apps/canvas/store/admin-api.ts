import {
  type AdminApiRoute,
  adminApiPath,
  adminCharacterOperationsPath,
  adminCharacterProactivePath,
  adminCharacterSummarizePath,
  adminConfigReloadPath,
  adminPromptAuthorPath,
  adminQueueJobAuthorPath,
  adminQueueJobPath,
  adminQueueRetryPath,
  adminStorageSweepPath,
  stripAuthority,
  TIMEOUTS_MS,
} from "@eidolon/config";
import type { ConfigBucket } from "@eidolon/config/registry";
import type {
  AdminAccount,
  AdminAuditView,
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
  options: { id?: string; method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<T> {
  const search = options.query ? `?${new URLSearchParams(options.query).toString()}` : "";
  const response = await fetch(`${httpBase(host)}${adminApiPath(route, options.id)}${search}`, {
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

async function send<T>(host: string, token: string, path: string, method: string): Promise<T> {
  const response = await fetch(`${httpBase(host)}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUTS_MS.generation),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new AdminRequestError(response.status, typeof body?.error === "string" ? body.error : "");
  }

  return body as T;
}

function post<T>(host: string, token: string, path: string): Promise<T> {
  return send<T>(host, token, path, "POST");
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

export type { AdminAuditView, AuditEntry } from "@eidolon/protocol";

export function fetchAudit(host: string, token: string, offset = 0): Promise<AdminAuditView> {
  return request(host, token, "audit", { query: { offset: String(offset) } });
}

export function clearAudit(host: string, token: string): Promise<{ ok: true; removed: number }> {
  return request(host, token, "audit", { method: "DELETE" });
}

export interface StoredObjectView {
  key: string;
  bytes: number;
  modifiedAt: number;
}

export interface StorageView {
  connected: boolean;
  endpoint: string;
  bucket: string;
  scanned: number;
  referenced: number;
  skipped: "not-connected" | "no-references" | null;
  freedBytes: number;
  removed: string[];
  orphans: StoredObjectView[];
  orphanBytes: number;
}

export function fetchStorage(host: string, token: string): Promise<StorageView> {
  return request(host, token, "storage");
}

export function sweepStorage(host: string, token: string): Promise<StorageView> {
  return post(host, token, adminStorageSweepPath());
}

export type QueueState = "waiting" | "active" | "delayed" | "failed" | "completed";

export interface QueueField {
  label: string;
  value: string;
  editable: boolean;
  kind: "string" | "number" | "boolean";
}

export interface QueueJobView {
  id: string;
  name: string;
  state: QueueState;
  attemptsMade: number;
  characterId: string | null;
  failedReason: string | null;
  createdAt: number;
  runAt: number | null;
  finishedAt: number | null;
  progress: number | null;
  input: QueueField[];
  output: string | null;
}

export interface QueueView {
  key: string;
  name: string;
  reachable: boolean;
  counts: Record<QueueState, number>;
  jobs: QueueJobView[];
}

export interface QueuesView {
  queues: QueueView[];
}

export function fetchQueues(host: string, token: string): Promise<QueuesView> {
  return request(host, token, "queues");
}

export function retryQueue(host: string, token: string, key: string): Promise<QueuesView> {
  return post(host, token, adminQueueRetryPath(key));
}

export function retryQueueJob(
  host: string,
  token: string,
  key: string,
  jobId: string,
): Promise<QueuesView> {
  return post(host, token, `${adminQueueJobPath(key, jobId)}/retry`);
}

export function removeQueueJob(
  host: string,
  token: string,
  key: string,
  jobId: string,
): Promise<QueuesView> {
  return send(host, token, adminQueueJobPath(key, jobId), "DELETE");
}

export interface ServiceDetail {
  endpoint: string;
  using: string;
  note: string;
}

export interface HealthView {
  status: string;
  version: string;
  uptime: number;
  services: Record<string, string>;
  storage: { type: string; endpoint: string; bucket: string; status: string };
  webSearch: { primary: string; hasSerperFallback: boolean; hasExaFallback: boolean };
  databaseLocation: string;
  details: Record<string, ServiceDetail>;
}

export function fetchHealth(host: string, token: string): Promise<HealthView> {
  return request(host, token, "health");
}

export interface PendingProactiveView {
  jobId: string;
  runAt: number;
  contextPrompt: string;
}

export interface CharacterOperationsView {
  messages: number;
  chapters: number;
  proactive: PendingProactiveView | null;
}

export function fetchCharacterOperations(
  host: string,
  token: string,
  characterId: string,
): Promise<CharacterOperationsView> {
  return send(host, token, adminCharacterOperationsPath(characterId), "GET");
}

export function summarizeCharacter(
  host: string,
  token: string,
  characterId: string,
): Promise<{ queued: true; jobId: string }> {
  return post(host, token, adminCharacterSummarizePath(characterId));
}

export function cancelProactive(
  host: string,
  token: string,
  characterId: string,
): Promise<{ ok: true }> {
  return send(host, token, adminCharacterProactivePath(characterId), "DELETE");
}

export async function editQueueJob(
  host: string,
  token: string,
  key: string,
  jobId: string,
  data: Record<string, unknown>,
  retry: boolean,
): Promise<QueuesView> {
  const response = await fetch(`${httpBase(host)}${adminQueueJobPath(key, jobId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data, retry }),
    signal: AbortSignal.timeout(TIMEOUTS_MS.generation),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new AdminRequestError(response.status, typeof body?.error === "string" ? body.error : "");
  }

  return body as unknown as QueuesView;
}

export async function authorQueueJobField(
  host: string,
  token: string,
  key: string,
  jobId: string,
  field: string,
  mode: "suggest" | "enhance",
  draft: string,
): Promise<PromptAuthorResult> {
  if (!host) return { text: null, error: null };

  try {
    const response = await fetch(`${httpBase(host)}${adminQueueJobAuthorPath(key, jobId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ field, mode, draft }),
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
