import { isSecureHost, PAIRING, SOCKET, stripAuthority } from "@eidolon/config";
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
import { pingHealth, verifyPairing } from "./connection-api";
import { appStorage } from "./storage";

export { pingHealth, verifyPairing };

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectionStore {
  serverHost: string;
  pairingToken: string;
  isPaired: boolean;
  connectionState: ConnectionState;
  lastError: string | null;
  isSocketOpen: boolean;
  initializeConnection: () => void;
  pairFromUri: (uri: string) => Promise<boolean>;
  setManualConnection: (host: string, token: string) => Promise<boolean>;
  connect: () => void;
  disconnect: () => void;
  unpair: () => void;
}

const STORAGE_KEYS = {
  HOST: "eidolon.server_host",
  TOKEN: "eidolon.pairing_token",
  IS_PAIRED: "eidolon.is_paired",
} as const;

/** Keeps a TLS scheme so the socket knows to use wss, drops anything else. */
export function normalizeHost(host: string): string {
  const trimmed = host.trim().replace(/\/+$/, "");
  return isSecureHost(trimmed) ? `https://${stripAuthority(trimmed)}` : stripAuthority(trimmed);
}

export function parsePairingUri(uri: string): { server: string; token: string } {
  const cleanUri = uri.trim();
  if (!cleanUri.startsWith(PAIRING.uriScheme)) {
    throw new Error(`Invalid pairing URI protocol. Expected ${PAIRING.uriScheme}?...`);
  }

  const queryPart = cleanUri.includes("?") ? cleanUri.split("?")[1] : "";
  const params = new URLSearchParams(queryPart);

  const server = params.get("server");
  const token = params.get("token");

  if (!server || !token) {
    throw new Error("Invalid pairing URI. Missing required 'server' or 'token' parameters.");
  }

  return { server: normalizeHost(server), token };
}

const SOCKET_STATE_MAP: Record<SocketStatus, ConnectionState> = {
  connected: "connected",
  connecting: "connecting",
  reconnecting: "error",
  disconnected: "disconnected",
};

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  serverHost: appStorage.getString(STORAGE_KEYS.HOST) ?? "",
  pairingToken: appStorage.getString(STORAGE_KEYS.TOKEN) ?? "",
  isPaired: appStorage.getBoolean(STORAGE_KEYS.IS_PAIRED) ?? false,
  connectionState: "disconnected",
  lastError: null,
  isSocketOpen: false,

  initializeConnection: () => {
    const host = appStorage.getString(STORAGE_KEYS.HOST) ?? "";
    const token = appStorage.getString(STORAGE_KEYS.TOKEN) ?? "";
    const isPaired = appStorage.getBoolean(STORAGE_KEYS.IS_PAIRED) ?? false;

    const paired = isPaired && Boolean(host) && Boolean(token);
    set({
      serverHost: host,
      pairingToken: token,
      isPaired: paired,
      connectionState: "disconnected",
      lastError: null,
    });

    if (paired) {
      get().connect();
    }
  },

  connect: () => {
    const { serverHost, pairingToken, isPaired } = get();
    if (!isPaired || !serverHost || !pairingToken) return;
    configureSocket({ host: serverHost, token: pairingToken });
    set({ connectionState: "connecting", lastError: null });
    openSocket();
  },

  disconnect: () => {
    closeSocket();
    set({ connectionState: "disconnected", isSocketOpen: false });
  },

  pairFromUri: async (uri: string): Promise<boolean> => {
    set({ connectionState: "connecting", lastError: null });
    try {
      const { server, token } = parsePairingUri(uri);
      await verifyPairing(server, token);

      appStorage.set(STORAGE_KEYS.HOST, server);
      appStorage.set(STORAGE_KEYS.TOKEN, token);
      appStorage.set(STORAGE_KEYS.IS_PAIRED, true);

      set({
        serverHost: server,
        pairingToken: token,
        isPaired: true,
        connectionState: "connecting",
        lastError: null,
      });

      get().connect();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pairing failed.";
      set({ connectionState: "error", lastError: message });
      throw err;
    }
  },

  setManualConnection: async (host: string, token: string): Promise<boolean> => {
    set({ connectionState: "connecting", lastError: null });
    try {
      const cleanHost = normalizeHost(host);
      const cleanToken = token.trim();

      if (!cleanHost || !cleanToken) {
        throw new Error("Both server host and pairing token are required.");
      }

      await verifyPairing(cleanHost, cleanToken);

      appStorage.set(STORAGE_KEYS.HOST, cleanHost);
      appStorage.set(STORAGE_KEYS.TOKEN, cleanToken);
      appStorage.set(STORAGE_KEYS.IS_PAIRED, true);

      set({
        serverHost: cleanHost,
        pairingToken: cleanToken,
        isPaired: true,
        connectionState: "connecting",
        lastError: null,
      });

      get().connect();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed.";
      set({ connectionState: "error", lastError: message });
      throw err;
    }
  },

  unpair: () => {
    closeSocket();
    configureSocket(null);
    resetSocketBackoff();
    appStorage.delete(STORAGE_KEYS.HOST);
    appStorage.delete(STORAGE_KEYS.TOKEN);
    appStorage.delete(STORAGE_KEYS.IS_PAIRED);

    set({
      serverHost: "",
      pairingToken: "",
      isPaired: false,
      connectionState: "disconnected",
      isSocketOpen: false,
      lastError: null,
    });
  },
}));

onSocketStatus((status) => {
  const { isPaired } = useConnectionStore.getState();
  if (!isPaired && status !== "disconnected") return;
  useConnectionStore.setState({
    connectionState: SOCKET_STATE_MAP[status],
    isSocketOpen: status === "connected",
    lastError: status === "reconnecting" ? "Connection lost. Reconnecting…" : null,
  });
});

onSocketRetry((attempt) => {
  if (attempt !== SOCKET.reVerifyAfterAttempts) return;
  const { serverHost, pairingToken } = useConnectionStore.getState();
  if (!serverHost || !pairingToken) return;
  verifyPairing(serverHost, pairingToken).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("rejected")) return;
    closeSocket();
    useConnectionStore.setState({ connectionState: "error", lastError: message });
  });
});
