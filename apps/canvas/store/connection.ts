import { CONNECT_COPY, isSecureHost, SOCKET, stripAuthority } from "@eidolon/config";
import { create } from "zustand";
import {
  closeSocket,
  configureSocket,
  onSocketRetry,
  onSocketStatus,
  openSocket,
  resetSocketBackoff,
  type SocketStatus,
} from "@/services/websocket";
import { pingHealth } from "./connection-api";
import { appStorage } from "./storage";

export { pingHealth };

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectionStore {
  serverHost: string;
  sessionToken: string;
  isSignedIn: boolean;
  connectionState: ConnectionState;
  lastError: string | null;
  isSocketOpen: boolean;
  initializeConnection: () => void;
  startSession: (host: string, token: string) => void;
  connect: () => void;
  disconnect: () => void;
  signOut: () => void;
}

const STORAGE_KEYS = {
  HOST: "eidolon.server_host",
  TOKEN: "eidolon.session_token",
} as const;

export function normalizeHost(host: string): string {
  const trimmed = host.trim().replace(/\/+$/, "");
  return isSecureHost(trimmed) ? `https://${stripAuthority(trimmed)}` : stripAuthority(trimmed);
}

const SOCKET_STATE_MAP: Record<SocketStatus, ConnectionState> = {
  connected: "connected",
  connecting: "connecting",
  reconnecting: "error",
  disconnected: "disconnected",
};

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  serverHost: appStorage.getString(STORAGE_KEYS.HOST) ?? "",
  sessionToken: appStorage.getString(STORAGE_KEYS.TOKEN) ?? "",
  isSignedIn: Boolean(
    appStorage.getString(STORAGE_KEYS.HOST) && appStorage.getString(STORAGE_KEYS.TOKEN),
  ),
  connectionState: "disconnected",
  lastError: null,
  isSocketOpen: false,

  initializeConnection: () => {
    const host = appStorage.getString(STORAGE_KEYS.HOST) ?? "";
    const token = appStorage.getString(STORAGE_KEYS.TOKEN) ?? "";

    set({
      serverHost: host,
      sessionToken: token,
      isSignedIn: Boolean(host && token),
      connectionState: "disconnected",
      lastError: null,
    });

    if (host && token) get().connect();
  },

  connect: () => {
    const { serverHost, sessionToken } = get();
    if (!serverHost || !sessionToken) return;
    configureSocket({ host: serverHost, token: sessionToken });
    set({ connectionState: "connecting", lastError: null });
    openSocket();
  },

  disconnect: () => {
    closeSocket();
    set({ connectionState: "disconnected", isSocketOpen: false });
  },

  startSession: (host: string, token: string) => {
    const cleanHost = normalizeHost(host);
    const cleanToken = token.trim();

    if (!cleanHost || !cleanToken) throw new Error(CONNECT_COPY.missingFields);

    appStorage.set(STORAGE_KEYS.HOST, cleanHost);
    appStorage.set(STORAGE_KEYS.TOKEN, cleanToken);

    set({
      serverHost: cleanHost,
      sessionToken: cleanToken,
      isSignedIn: true,
      connectionState: "connecting",
      lastError: null,
    });

    get().connect();
  },

  signOut: () => {
    closeSocket();
    configureSocket(null);
    resetSocketBackoff();
    appStorage.delete(STORAGE_KEYS.TOKEN);

    set({
      sessionToken: "",
      isSignedIn: false,
      connectionState: "disconnected",
      isSocketOpen: false,
      lastError: null,
    });
  },
}));

export function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { sessionToken } = useConnectionStore.getState();
  if (!sessionToken) return fetch(url, init);
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${sessionToken}` },
  });
}

onSocketStatus((status) => {
  useConnectionStore.setState({
    connectionState: SOCKET_STATE_MAP[status],
    isSocketOpen: status === "connected",
    lastError: status === "reconnecting" ? "Connection lost. Reconnecting…" : null,
  });
});

onSocketRetry((attempt) => {
  if (attempt !== SOCKET.reVerifyAfterAttempts) return;
  const { serverHost, sessionToken } = useConnectionStore.getState();
  if (!serverHost || !sessionToken) return;
  pingHealth(serverHost, sessionToken).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    closeSocket();
    useConnectionStore.setState({ connectionState: "error", lastError: message });
  });
});
