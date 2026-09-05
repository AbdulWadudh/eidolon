import { API_ROUTES } from "@eidolon/config";
import type { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { validateToken } from "@/auth";
import { handleClientMessage, sessionManager } from "@/ws/handler";

export const { upgradeWebSocket, websocket } = createBunWebSocket();

let connectedDevices = 0;

export function getConnectedDeviceCount(): number {
  return connectedDevices;
}

export function setupWebSocketRoutes(app: Hono): void {
  app.get(
    API_ROUTES.ws,
    async (c, next) => {
      const token =
        c.req.query("token") || c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");

      if (!validateToken(token)) {
        return c.text("Unauthorized", 401);
      }

      await next();
    },
    upgradeWebSocket((_c) => {
      return {
        onOpen(_event, _ws) {
          connectedDevices += 1;
        },
        async onMessage(event, ws) {
          await handleClientMessage(ws, event.data);
        },
        onClose(_event, ws) {
          connectedDevices = Math.max(0, connectedDevices - 1);
          sessionManager.cleanup(ws);
        },
        onError(_event, ws) {
          connectedDevices = Math.max(0, connectedDevices - 1);
          sessionManager.cleanup(ws);
        },
      };
    }),
  );
}
