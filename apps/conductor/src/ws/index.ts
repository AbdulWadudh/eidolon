import { API_ROUTES } from "@eidolon/config";
import type { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { UserEnv } from "@/auth/guard";
import { ownerFor } from "@/auth/session";
import { handleClientMessage, sessionManager } from "@/ws/handler";
import { releaseSocket, trackSocket } from "@/ws/registry";

export const { upgradeWebSocket, websocket } = createBunWebSocket();

let connectedDevices = 0;

export function getConnectedDeviceCount(): number {
  return connectedDevices;
}

export function setupWebSocketRoutes(app: Hono<UserEnv>): void {
  app.get(
    API_ROUTES.ws,
    async (c, next) => {
      const token =
        c.req.query("token") || c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");

      const account = await ownerFor(token);
      if (!account) {
        return c.text("Unauthorized", 401);
      }

      c.set("user", account);
      await next();
    },
    upgradeWebSocket((c) => {
      const userId = c.get("user").id;

      return {
        onOpen(_event, ws) {
          connectedDevices += 1;
          trackSocket(ws, userId);
        },
        async onMessage(event, ws) {
          trackSocket(ws, userId);
          await handleClientMessage(ws, event.data, userId);
        },
        onClose(_event, ws) {
          connectedDevices = Math.max(0, connectedDevices - 1);
          sessionManager.cleanup(ws);
          releaseSocket(ws);
        },
        onError(_event, ws) {
          connectedDevices = Math.max(0, connectedDevices - 1);
          sessionManager.cleanup(ws);
          releaseSocket(ws);
        },
      };
    }),
  );
}
