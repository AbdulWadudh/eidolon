import { ThemeTokenPatchSchema } from "@eidolon/protocol";
import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import {
  applyThemePatch,
  buildThemeView,
  isThemeToken,
  resetTheme,
  resetThemeToken,
} from "@/services/theme";

export const adminTheme = new Hono<OwnerEnv>();

adminTheme.get("/", (c) => c.json(buildThemeView()));

adminTheme.patch("/", async (c) => {
  const parsed = ThemeTokenPatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "That is not a theme token patch." }, 400);
  if (Object.keys(parsed.data).length === 0) return c.json({ error: "Nothing to change." }, 400);

  return c.json(applyThemePatch(parsed.data));
});

adminTheme.delete("/", (c) => {
  resetTheme();
  return c.json(buildThemeView());
});

adminTheme.delete("/:token", (c) => {
  const token = c.req.param("token");
  if (!isThemeToken(token)) return c.json({ error: "No such theme token." }, 404);
  if (!resetThemeToken(token)) return c.json({ error: "That token is not overridden." }, 404);

  return c.json(buildThemeView());
});
