import { CACHE } from "@eidolon/config";
import { getCacheUrl } from "@eidolon/config/server";
import { RedisClient } from "bun";

let client: RedisClient | null = null;
let unavailable = false;

function connect(): RedisClient | null {
  if (unavailable) return null;
  if (client) return client;

  try {
    client = new RedisClient(getCacheUrl(), {
      connectionTimeout: CACHE.connectTimeoutMs,
      autoReconnect: true,
    });
    client.onclose = () => {
      client = null;
    };
    return client;
  } catch {
    unavailable = true;
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const redis = connect();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = connect();
  if (!redis) return;
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    // A cache miss is always survivable; SQLite remains the source of truth.
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = connect();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Nothing to do; the next read falls through to SQLite.
  }
}

export async function checkCacheHealth(): Promise<boolean> {
  const redis = connect();
  if (!redis) return false;
  try {
    return (await redis.ping()) !== null;
  } catch {
    return false;
  }
}

export function closeCache(): void {
  client?.close();
  client = null;
}
