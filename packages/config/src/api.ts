export const API_VERSION = "v1";

export const API_PREFIX = `/api/${API_VERSION}` as const;

export const API_ROUTES = {
  health: "/health",
  pairing: "/pairing",
  pairVerify: "/pair/verify",
  pairingQr: "/pairing/qr",
  pairingStatus: "/pairing/status",
  ws: "/ws",
} as const;

export type ApiRoute = keyof typeof API_ROUTES;

export const HEALTH_ALIAS_PATH = "/health";

export const STATIC_ROUTES = {
  logo: "/assets/logo.svg",
} as const;

export function apiPath(route: ApiRoute): string {
  return `${API_PREFIX}${API_ROUTES[route]}`;
}

export function apiUrl(host: string, route: ApiRoute, scheme: "http" | "https" = "http"): string {
  return `${scheme}://${stripAuthority(host)}${apiPath(route)}`;
}

export function socketUrl(host: string, token: string, scheme: "ws" | "wss" = "ws"): string {
  return `${scheme}://${stripAuthority(host)}${apiPath("ws")}?token=${encodeURIComponent(token)}`;
}

export function stripAuthority(host: string): string {
  return host.replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "");
}
