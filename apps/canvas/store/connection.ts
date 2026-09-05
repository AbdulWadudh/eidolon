import { PAIRING, RECONNECT_DELAYS_MS, socketUrl, stripAuthority } from "@eidolon/config";
import { create } from "zustand";
import { pingHealth, verifyPairing } from "./connection-api";
import { appStorage } from "./storage";

export { pingHealth, verifyPairing };

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

/** Failures before asking the server over HTTP whether the token is still valid. */
const RE_VERIFY_AFTER_ATTEMPTS = 2;

export interface ConnectionStore {
  serverHost: string;
  pairingToken: string;
  isPaired: boolean;
  connectionState: ConnectionState;
  lastError: string | null;
  /** True only while the socket is actually open. */
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

export function parsePairingUri(uri: string): { server: string; token: string } {
  const cleanUri = uri.trim();
  if (!cleanUri.startsWith(PAIRING.uriScheme)) {
    throw new Error(`Invalid pairing URI protocol. Expected ${PAIRING.uriScheme}?...`);
  }

  // Handle URL parsing across native and node/bun
  const queryPart = cleanUri.includes("?") ? cleanUri.split("?")[1] : "";
  const params = new URLSearchParams(queryPart);

  const server = params.get("server");
  const token = params.get("token");

  if (!server || !token) {
    throw new Error("Invalid pairing URI. Missing required 'server' or 'token' parameters.");
  }

  // Strip http:// or https:// if provided in server parameter
  const cleanHost = stripAuthority(server);

  return { server: cleanHost, token };
}

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
/** Set when the user unpairs, so a pending close does not schedule a retry. */
let intentionalClose = false;

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function closeSocket(): void {
  intentionalClose = true;
  clearReconnectTimer();
  if (socket) {
    socket.close();
    socket = null;
  }
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  serverHost: appStorage.getString(STORAGE_KEYS.HOST) ?? "",
  pairingToken: appStorage.getString(STORAGE_KEYS.TOKEN) ?? "",
  isPaired: appStorage.getBoolean(STORAGE_KEYS.IS_PAIRED) ?? false,
  // Being paired only means credentials are stored; the socket decides "connected".
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
    if (socket && (socket.readyState === 0 || socket.readyState === 1)) return;

    if (typeof WebSocket === "undefined") {
      set({ connectionState: "error", lastError: "WebSocket is unavailable in this environment." });
      return;
    }

    intentionalClose = false;
    clearReconnectTimer();
    set({ connectionState: "connecting" });

    const url = socketUrl(serverHost, pairingToken);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      set({
        connectionState: "error",
        isSocketOpen: false,
        lastError: err instanceof Error ? err.message : "Could not open a socket.",
      });
      return;
    }
    socket = ws;

    ws.onopen = () => {
      reconnectAttempt = 0;
      set({ connectionState: "connected", isSocketOpen: true, lastError: null });
    };

    ws.onerror = () => {
      // The close handler owns retrying; onerror carries no useful detail here.
      set({ connectionState: "error", isSocketOpen: false });
    };

    ws.onclose = () => {
      if (socket === ws) socket = null;
      set({ isSocketOpen: false });

      if (intentionalClose) {
        set({ connectionState: "disconnected" });
        return;
      }

      const attempt = reconnectAttempt;
      reconnectAttempt += 1;

      // The gateway rejects a bad token with HTTP 401 before the upgrade, so the
      // socket only ever reports a generic abnormal close - indistinguishable
      // from the server being down. After a couple of failures, ask over HTTP
      // which it is, so a revoked token stops an endless retry loop.
      if (attempt === RE_VERIFY_AFTER_ATTEMPTS) {
        const { serverHost: host, pairingToken: currentToken } = get();
        verifyPairing(host, currentToken).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes("rejected")) {
            closeSocket();
            set({ connectionState: "error", lastError: message });
          }
        });
      }

      const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      set({ connectionState: "error", lastError: "Connection lost. Reconnecting…" });
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => get().connect(), delay);
    };
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
      const cleanHost = host
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .trim();
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
    reconnectAttempt = 0;
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
