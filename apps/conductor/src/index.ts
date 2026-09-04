import { COLORS } from "@eidolon/tokens";
import { Hono } from "hono";

export const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "eidolon-conductor",
    timestamp: Date.now(),
    themeAccent: COLORS.accentAmber,
  });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
