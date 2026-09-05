import { RECONNECT_DELAYS_MS, SOCKET, socketUrl } from "@eidolon/config";
import {
  type ClientMessage,
  type ServerMessage,
  safeParseClientMessage,
  safeParseServerMessage,
} from "@eidolon/protocol";
import * as React from "react";

export type SocketStatus = "connected" | "connecting" | "disconnected" | "reconnecting";

export interface SocketCredentials {
  host: string;
  token: string;
}

type MessageListener = (message: ServerMessage) => void;
type StatusListener = (status: SocketStatus) => void;
type RetryListener = (attempt: number) => void;

const messageListeners = new Set<MessageListener>();
const statusListeners = new Set<StatusListener>();
const retryListeners = new Set<RetryListener>();

let credentials: SocketCredentials | null = null;
let socket: WebSocket | null = null;
let status: SocketStatus = "disconnected";
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let attempt = 0;
let closedByUs = false;

function publishStatus(next: SocketStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of statusListeners) listener(next);
}

function publishMessage(message: ServerMessage): void {
  for (const listener of messageListeners) listener(message);
}

function publishRetry(count: number): void {
  for (const listener of retryListeners) listener(count);
}

function stopTimers(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    sendMessage({ type: "ping", timestamp: Date.now() });
  }, SOCKET.heartbeatIntervalMs);
}

function scheduleReconnect(): void {
  const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
  attempt += 1;
  publishRetry(attempt);
  publishStatus("reconnecting");
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openSocket();
  }, delay);
}

export function configureSocket(next: SocketCredentials | null): void {
  const changed = credentials?.host !== next?.host || credentials?.token !== next?.token;
  credentials = next;
  if (changed) {
    attempt = 0;
    if (socket) closeSocket();
  }
}

export function openSocket(): void {
  if (!credentials?.host || !credentials.token) return;
  if (
    socket &&
    (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)
  )
    return;
  if (typeof WebSocket === "undefined") {
    publishStatus("disconnected");
    return;
  }

  closedByUs = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  publishStatus(attempt === 0 ? "connecting" : "reconnecting");

  let next: WebSocket;
  try {
    next = new WebSocket(socketUrl(credentials.host, credentials.token));
  } catch {
    scheduleReconnect();
    return;
  }
  socket = next;

  next.onopen = () => {
    attempt = 0;
    publishStatus("connected");
    startHeartbeat();
  };

  next.onmessage = (event: MessageEvent) => {
    const parsed = safeParseServerMessage(event.data);
    if (!parsed.success) return;
    publishMessage(parsed.data);
  };

  next.onerror = () => {
    publishStatus(attempt === 0 ? "connecting" : "reconnecting");
  };

  next.onclose = () => {
    if (socket === next) socket = null;
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (closedByUs) {
      publishStatus("disconnected");
      return;
    }
    scheduleReconnect();
  };
}

export function closeSocket(): void {
  closedByUs = true;
  stopTimers();
  if (socket) {
    socket.close();
    socket = null;
  }
  publishStatus("disconnected");
}

export function resetSocketBackoff(): void {
  attempt = 0;
}

export function sendMessage(payload: ClientMessage): boolean {
  const parsed = safeParseClientMessage(payload);
  if (!parsed.success) return false;
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(parsed.data));
  return true;
}

export function getSocketStatus(): SocketStatus {
  return status;
}

export function onServerMessage(listener: MessageListener): () => void {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

export function onSocketStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function onSocketRetry(listener: RetryListener): () => void {
  retryListeners.add(listener);
  return () => {
    retryListeners.delete(listener);
  };
}

export interface ConductorSocket {
  status: SocketStatus;
  isConnected: boolean;
  sendMessage: (payload: ClientMessage) => boolean;
}

export function useConductorSocket(): ConductorSocket {
  const [current, setCurrent] = React.useState<SocketStatus>(getSocketStatus);

  React.useEffect(() => {
    setCurrent(getSocketStatus());
    return onSocketStatus(setCurrent);
  }, []);

  return React.useMemo(
    () => ({
      status: current,
      isConnected: current === "connected",
      sendMessage,
    }),
    [current],
  );
}
