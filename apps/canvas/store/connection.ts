import { create } from "zustand";
import { appStorage } from "./storage";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectionStore {
  serverHost: string;
  pairingToken: string;
  isPaired: boolean;
  connectionState: ConnectionState;
  lastError: string | null;
  initializeConnection: () => void;
  pairFromUri: (uri: string) => Promise<boolean>;
  setManualConnection: (host: string, token: string) => Promise<boolean>;
  unpair: () => void;
}

const STORAGE_KEYS = {
  HOST: "eidolon.server_host",
  TOKEN: "eidolon.pairing_token",
  IS_PAIRED: "eidolon.is_paired",
} as const;

export function parsePairingUri(uri: string): { server: string; token: string } {
  const cleanUri = uri.trim();
  if (!cleanUri.startsWith("eidolon://pair")) {
    throw new Error("Invalid pairing URI protocol. Expected eidolon://pair?...");
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
  const cleanHost = server.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

  return { server: cleanHost, token };
}

export async function pingHealth(host: string, token?: string): Promise<boolean> {
  const cleanHost = host.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`http://${cleanHost}/health`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      throw new Error(`Conductor host '${cleanHost}' unreachable: ${err.message}`);
    }
    throw new Error(`Conductor host '${cleanHost}' unreachable.`);
  }
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  serverHost: appStorage.getString(STORAGE_KEYS.HOST) ?? "",
  pairingToken: appStorage.getString(STORAGE_KEYS.TOKEN) ?? "",
  isPaired: appStorage.getBoolean(STORAGE_KEYS.IS_PAIRED) ?? false,
  connectionState:
    (appStorage.getBoolean(STORAGE_KEYS.IS_PAIRED) ?? false) ? "connected" : "disconnected",
  lastError: null,

  initializeConnection: () => {
    const host = appStorage.getString(STORAGE_KEYS.HOST) ?? "";
    const token = appStorage.getString(STORAGE_KEYS.TOKEN) ?? "";
    const isPaired = appStorage.getBoolean(STORAGE_KEYS.IS_PAIRED) ?? false;

    set({
      serverHost: host,
      pairingToken: token,
      isPaired: isPaired && Boolean(host) && Boolean(token),
      connectionState: isPaired && host ? "connected" : "disconnected",
      lastError: null,
    });
  },

  pairFromUri: async (uri: string): Promise<boolean> => {
    set({ connectionState: "connecting", lastError: null });
    try {
      const { server, token } = parsePairingUri(uri);
      await pingHealth(server, token);

      appStorage.set(STORAGE_KEYS.HOST, server);
      appStorage.set(STORAGE_KEYS.TOKEN, token);
      appStorage.set(STORAGE_KEYS.IS_PAIRED, true);

      set({
        serverHost: server,
        pairingToken: token,
        isPaired: true,
        connectionState: "connected",
        lastError: null,
      });

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

      await pingHealth(cleanHost, cleanToken);

      appStorage.set(STORAGE_KEYS.HOST, cleanHost);
      appStorage.set(STORAGE_KEYS.TOKEN, cleanToken);
      appStorage.set(STORAGE_KEYS.IS_PAIRED, true);

      set({
        serverHost: cleanHost,
        pairingToken: cleanToken,
        isPaired: true,
        connectionState: "connected",
        lastError: null,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed.";
      set({ connectionState: "error", lastError: message });
      throw err;
    }
  },

  unpair: () => {
    appStorage.delete(STORAGE_KEYS.HOST);
    appStorage.delete(STORAGE_KEYS.TOKEN);
    appStorage.delete(STORAGE_KEYS.IS_PAIRED);

    set({
      serverHost: "",
      pairingToken: "",
      isPaired: false,
      connectionState: "disconnected",
      lastError: null,
    });
  },
}));
