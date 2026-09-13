import { CONNECT_COPY, healthUrl, TIMEOUTS_MS } from "@eidolon/config";

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
