export const API_VERSION = "v1";

export const API_PREFIX = `/api/${API_VERSION}` as const;

export const API_ROUTES = {
  health: "/health",
  pairing: "/pairing",
  pairVerify: "/pair/verify",
  pairingQr: "/pairing/qr",
  pairingStatus: "/pairing/status",
  ws: "/ws",
  prompts: "/prompts",
  characters: "/characters",
} as const;

export type ApiRoute = keyof typeof API_ROUTES;

export const HEALTH_ALIAS_PATH = "/health";

export const STATIC_ROUTES = {
  logo: "/assets/logo.svg",
} as const;

export const ADMIN_ROUTES = {
  queues: "/admin/queues",
} as const;

export type AdminRoute = keyof typeof ADMIN_ROUTES;

export function adminPath(route: AdminRoute): string {
  return ADMIN_ROUTES[route];
}

export function adminUrl(host: string, route: AdminRoute, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${adminPath(route)}`;
}

export function apiPath(route: ApiRoute): string {
  return `${API_PREFIX}${API_ROUTES[route]}`;
}

/**
 * A host written with a TLS scheme keeps it. Everything else stays plain, so a
 * LAN address like 192.168.1.39:3000 is unaffected while a deployed origin like
 * https://3000.example.com reaches the socket over wss rather than failing.
 */
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

export function characterPath(characterId: string): string {
  return `${apiPath("characters")}/${encodeURIComponent(characterId)}`;
}

export function characterUrl(host: string, characterId: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${characterPath(characterId)}`;
}

export function charactersUrl(host: string, scheme = httpScheme(host)): string {
  return `${scheme}://${stripAuthority(host)}${apiPath("characters")}`;
}

export function characterLorePath(characterId: string): string {
  return `${characterPath(characterId)}/lore`;
}

export function characterLoreUrl(
  host: string,
  characterId: string,
  scheme = httpScheme(host),
): string {
  return `${scheme}://${stripAuthority(host)}${characterLorePath(characterId)}`;
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
