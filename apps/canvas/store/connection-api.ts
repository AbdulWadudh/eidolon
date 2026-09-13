import { apiUrl, CONNECT_COPY, healthUrl, TIMEOUTS_MS } from "@eidolon/config";

export async function pingHealth(host: string, token?: string): Promise<boolean> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(healthUrl(host), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!response.ok) throw new Error(CONNECT_COPY.serverError);
    return true;
  } catch {
    throw new Error(CONNECT_COPY.unreachable);
  }
}

export type SessionCheck = "alive" | "rejected" | "unreachable";

export async function verifySession(host: string, token: string): Promise<SessionCheck> {
  let response: Response;
  try {
    response = await fetch(apiUrl(host, "session"), {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
  } catch {
    return "unreachable";
  }

  if (response.status === 401 || response.status === 403) return "rejected";
  if (!response.ok) return "unreachable";

  try {
    const body = (await response.json()) as { account: unknown };
    return body.account ? "alive" : "rejected";
  } catch {
    return "unreachable";
  }
}
