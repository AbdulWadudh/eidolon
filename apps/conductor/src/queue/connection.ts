import { CACHE } from "@eidolon/config";
import { getCacheUrl } from "@eidolon/config/server";
import type { ConnectionOptions } from "bullmq";

export interface QueueConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
}

function selectedDatabase(pathname: string): number | undefined {
  const index = Number(pathname.replace(/^\//, ""));
  return Number.isInteger(index) && index > 0 ? index : undefined;
}

export function buildQueueConnection(rawUrl: string): QueueConnectionOptions {
  const url = new URL(rawUrl);
  const db = selectedDatabase(url.pathname);

  return {
    host: url.hostname,
    port: Number(url.port) || CACHE.defaultPort,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(db === undefined ? {} : { db }),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

let cached: QueueConnectionOptions | null = null;

export function queueConnection(): ConnectionOptions {
  if (!cached) {
    cached = buildQueueConnection(getCacheUrl());
  }
  return cached;
}

export function describeQueueConnection(): string {
  const { host, port, db } = queueConnection() as QueueConnectionOptions;
  return db === undefined ? `${host}:${port}` : `${host}:${port}/${db}`;
}
