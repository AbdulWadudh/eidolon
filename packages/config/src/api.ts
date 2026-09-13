export const API_VERSION = "v1";

export const API_PREFIX = `/api/${API_VERSION}` as const;

export const API_ROUTES = {
  health: "/health",
  pairing: "/pairing",
  pairVerify: "/pair/verify",
  pairingQr: "/pairing/qr",
  pairingStatus: "/pairing/status",
  ws: "/ws",
  session: "/session",
  prompts: "/prompts",
  characters: "/characters",
  voices: "/voices",
} as const;

export type ApiRoute = keyof typeof API_ROUTES;

export const HEALTH_ALIAS_PATH = "/health";

export const STATIC_ROUTES = {
  logo: "/assets/logo.svg",
} as const;

export const AUTH_ROUTES = {
  base: "/api/auth",
} as const;

export const ADMIN_ROUTES = {
  queues: "/admin/queues",
} as const;

export type AdminRoute = keyof typeof ADMIN_ROUTES;

export const ADMIN_API_PREFIX = `${API_PREFIX}/admin` as const;

export const ADMIN_API_ROUTES = {
  prompts: "/prompts",
  characters: "/characters",
  users: "/users",
  theme: "/theme",
  config: "/config",
  audit: "/audit",
  storage: "/storage",
  queues: "/queues",
  health: "/health",
} as const;

export type AdminApiRoute = keyof typeof ADMIN_API_ROUTES;

export function adminApiPath(route: AdminApiRoute, id?: string): string {
  const base = `${ADMIN_API_PREFIX}${ADMIN_API_ROUTES[route]}`;
  return id === undefined ? base : `${base}/${encodeURIComponent(id)}`;
}

export function adminApiUrl(
  host: string,
  route: AdminApiRoute,
  id?: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${adminApiPath(route, id)}`;
}

export function adminPromptAuthorPath(key: string): string {
  return `${adminApiPath("prompts", key)}/author`;
}

export function adminPromptAuthorUrl(host: string, key: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${adminPromptAuthorPath(key)}`;
}

export function adminStorageSweepPath(): string {
  return `${adminApiPath("storage")}/sweep`;
}

export function adminQueueRetryPath(queueKey: string): string {
  return `${adminApiPath("queues", queueKey)}/retry`;
}

export function adminQueueJobPath(queueKey: string, jobId: string): string {
  return `${adminApiPath("queues", queueKey)}/jobs/${encodeURIComponent(jobId)}`;
}

export function adminCharacterOperationsPath(characterId: string): string {
  return `${adminApiPath("characters", characterId)}/operations`;
}

export function adminCharacterSummarizePath(characterId: string): string {
  return `${adminApiPath("characters", characterId)}/summarize`;
}

export function adminCharacterProactivePath(characterId: string): string {
  return `${adminApiPath("characters", characterId)}/proactive`;
}

export function adminConfigReloadPath(): string {
  return `${adminApiPath("config")}/reload`;
}

export function adminConfigReloadUrl(host: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${adminConfigReloadPath()}`;
}

export function adminPath(route: AdminRoute): string {
  return ADMIN_ROUTES[route];
}

export function adminUrl(host: string, route: AdminRoute, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${adminPath(route)}`;
}

export function apiPath(route: ApiRoute): string {
  return `${API_PREFIX}${API_ROUTES[route]}`;
}

export function isSecureHost(host: string): boolean {
  return /^(https|wss):\/\//i.test(host.trim());
}

export function httpScheme(host: string): "http" | "https" {
  return isSecureHost(host) ? "https" : "http";
}

export function socketScheme(host: string): "ws" | "wss" {
  return isSecureHost(host) ? "wss" : "ws";
}

export function apiUrl(host: string, route: ApiRoute, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${apiPath(route)}`;
}

export function healthUrl(host: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${HEALTH_ALIAS_PATH}`;
}

export function socketUrl(host: string, token: string, scheme = socketScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${apiPath("ws")}?token=${encodeURIComponent(token)}`;
}

export function stripAuthority(host: string): string {
  return host.replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "");
}

export function characterMessagesPath(characterId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}/messages`;
}

export function characterLookPath(characterId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}/look`;
}

export function characterLookUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterLookPath(characterId)}`;
}

export function characterMessagePath(characterId: string, messageId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}/messages/${encodeURIComponent(messageId)}`;
}

export function characterMessageUrl(
  host: string,
  characterId: string,
  messageId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterMessagePath(characterId, messageId)}`;
}

export function characterMessagesUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterMessagesPath(characterId)}`;
}

export function voicesUrl(host: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${apiPath("voices")}`;
}

export function voicePreviewUrl(host: string, voiceId: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${apiPath("voices")}/${encodeURIComponent(voiceId)}/preview`;
}

export function characterPath(characterId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}`;
}

export function characterUrl(host: string, characterId: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${characterPath(characterId)}`;
}

export function charactersUrl(host: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${apiPath("characters")}`;
}

export function characterLorePath(characterId: string, entryId?: string): string {
  const base = `${characterPath(characterId)}/lore`;
  return entryId ? `${base}/${encodeURIComponent(entryId)}` : base;
}

export function characterLoreUrl(
  host: string,
  characterId: string,
  entryId?: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterLorePath(characterId, entryId)}`;
}

export function characterGalleryPath(characterId: string): string {
  return `${characterPath(characterId)}/gallery`;
}

export function characterGalleryUrl(
  host: string,
  characterId: string,
  options: { limit?: number; offset?: number } = {},
  scheme = httpScheme(host),
): string {
  const query = new URLSearchParams();
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  if (options.offset !== undefined) query.set("offset", String(options.offset));
  const search = query.size > 0 ? `?${query.toString()}` : "";
  return `${scheme}://${stripAuthority(host)}${characterGalleryPath(characterId)}${search}`;
}

export function characterPortraitPath(characterId: string): string {
  return `${characterPath(characterId)}/portrait`;
}

export function characterPortraitUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterPortraitPath(characterId)}`;
}

export function characterMindPath(characterId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}/mind`;
}

export function characterMindUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterMindPath(characterId)}`;
}

export function characterAffinityPath(characterId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}/affinity`;
}

export function characterAffinityUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterAffinityPath(characterId)}`;
}

export function characterMemoryPath(characterId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}/memory`;
}

export function characterMemoryUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterMemoryPath(characterId)}`;
}

export function characterImportPath(): string {
  return `${apiPath("characters")}/import`;
}

export function characterImportUrl(host: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${characterImportPath()}`;
}

export function characterExportPath(characterId: string): string {
  return `${characterPath(characterId)}/export`;
}

export function characterExportUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterExportPath(characterId)}`;
}

export function characterChroniclePath(characterId: string, chapterId?: string): string {
  const base = `${apiPath("characters")}/${encodeURIComponent(characterId)}/chronicle`;
  return chapterId ? `${base}/${encodeURIComponent(chapterId)}` : base;
}

export function characterChronicleUrl(
  host: string,
  characterId: string,
  chapterId?: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterChroniclePath(characterId, chapterId)}`;
}

export function characterSummarizePath(characterId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}/chronicle/summarize`;
}

export function characterSummarizeUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterSummarizePath(characterId)}`;
}
