import { apiUrl, healthUrl, PAIRING_COPY, TIMEOUTS_MS } from "@eidolon/config";

/**
 * Confirms the token is actually accepted by this conductor.
 *
 * /health is unauthenticated, so pinging it only proved the host was reachable:
 * a stale QR code or a mistyped token paired "successfully" and then failed at
 * the WebSocket upgrade with nothing to explain why.
 */
export async function verifyPairing(host: string, token: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS_MS.clientRequest);

  let response: Response;
  try {
    response = await fetch(apiUrl(host, "pairVerify"), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch {
    throw new Error(PAIRING_COPY.unreachable);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    throw new Error(PAIRING_COPY.refused);
  }
  if (!response.ok) {
    throw new Error(PAIRING_COPY.serverError);
  }
}

export async function pingHealth(host: string, token?: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS_MS.clientRequest);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(healthUrl(host), {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    return true;
  } catch {
    clearTimeout(timeoutId);
    throw new Error(PAIRING_COPY.unreachable);
  }
}

/**
 * Socket lifecycle lives outside the store: it is imperative, must survive
 * re-renders, and must never be duplicated by a second subscriber.
 */
