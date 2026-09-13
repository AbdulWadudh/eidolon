import { AUTH, AUTH_ROUTES, apiPath, stripAuthority, TIMEOUTS_MS } from "@eidolon/config";
import type { UserRole } from "@eidolon/protocol";
import { create } from "zustand";
import { appStorage } from "@/store/storage";

export interface Account {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Credentials {
  email: string;
  password: string;
  name?: string;
}

const ACCOUNT_KEY = "eidolon.account";

function httpBase(host: string): string {
  return host.startsWith("http") ? host.replace(/\/+$/, "") : `http://${stripAuthority(host)}`;
}

function loadAccount(): Account | null {
  const raw = appStorage.getString(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Account;
  } catch {
    return null;
  }
}

async function post(host: string, path: string, body: Record<string, string>): Promise<Response> {
  return fetch(`${httpBase(host)}${AUTH_ROUTES.base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "omit",
    signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
  });
}

export interface AuthCredential {
  token: string;
  account: Account;
}

export async function signIn(host: string, credentials: Credentials): Promise<AuthCredential> {
  const response = await post(host, "/sign-in/email", {
    email: credentials.email.trim(),
    password: credentials.password,
  });
  return readCredential(response);
}

export async function signUp(host: string, credentials: Credentials): Promise<AuthCredential> {
  const response = await post(host, "/sign-up/email", {
    email: credentials.email.trim(),
    password: credentials.password,
    name: credentials.name?.trim() || credentials.email.trim(),
  });
  return readCredential(response);
}

async function readCredential(response: Response): Promise<AuthCredential> {
  const body = (await response.json().catch(() => null)) as {
    token?: string;
    user?: { id?: string; name?: string; email?: string; role?: string };
    message?: string;
  } | null;

  if (!response.ok || !body?.token || !body.user?.id) {
    throw new Error(body?.message ?? "");
  }

  return {
    token: body.token,
    account: {
      id: body.user.id,
      name: body.user.name ?? "",
      email: body.user.email ?? "",
      role: body.user.role === AUTH.ownerRole ? AUTH.ownerRole : AUTH.memberRole,
    },
  };
}

export async function fetchAccount(host: string, token: string): Promise<Account | null> {
  if (!host || !token) return null;

  try {
    const response = await fetch(`${httpBase(host)}${apiPath("session")}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "omit",
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { account: Account | null };
    return body.account;
  } catch {
    return null;
  }
}

export interface AuthStore {
  account: Account | null;
  isResolved: boolean;
  setAccount: (account: Account | null) => void;
  refresh: (host: string, token: string) => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  account: loadAccount(),
  isResolved: false,

  setAccount: (account) => {
    if (account) appStorage.set(ACCOUNT_KEY, JSON.stringify(account));
    else appStorage.delete(ACCOUNT_KEY);
    set({ account, isResolved: true });
  },

  refresh: async (host, token) => {
    const account = await fetchAccount(host, token);
    if (account) appStorage.set(ACCOUNT_KEY, JSON.stringify(account));
    else appStorage.delete(ACCOUNT_KEY);
    set({ account, isResolved: true });
  },

  clear: () => {
    appStorage.delete(ACCOUNT_KEY);
    set({ account: null, isResolved: true });
  },
}));

export function useIsOwner(): boolean {
  return useAuthStore((state) => state.account?.role === AUTH.ownerRole);
}
