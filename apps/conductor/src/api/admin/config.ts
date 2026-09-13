import { BUCKET_COPY, CONFIG_BUCKETS } from "@eidolon/config/registry";
import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import {
  clearConfigOverride,
  configGeneration,
  describeConfig,
  reloadConfig,
  setConfigOverride,
} from "@/services/config";

export const adminConfig = new Hono<OwnerEnv>();

function view() {
  const settings = describeConfig();

  return {
    generation: configGeneration(),
    buckets: CONFIG_BUCKETS.map((bucket) => ({
      bucket,
      ...BUCKET_COPY[bucket],
      count: settings.filter((entry) => entry.bucket === bucket).length,
    })),
    overridden: settings.filter((entry) => entry.isOverridden).length,
    settings,
  };
}

adminConfig.get("/", (c) => c.json(view()));

adminConfig.post("/reload", (c) => c.json({ ...reloadConfig(), settings: describeConfig() }));

adminConfig.put("/:path", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { value?: unknown } | null;
  if (body === null || !("value" in body)) {
    return c.json({ error: "Body must be { value }." }, 400);
  }

  const outcome = setConfigOverride(c.req.param("path"), body.value);
  if (!outcome.ok) return c.json({ error: outcome.error }, outcome.status);

  return c.json({
    setting: describeConfig().find((entry) => entry.path === outcome.override.path),
  });
});

adminConfig.delete("/:path", (c) => {
  const outcome = clearConfigOverride(c.req.param("path"));
  if (!outcome.ok) return c.json({ error: outcome.error }, outcome.status);

  return c.json({
    setting: describeConfig().find((entry) => entry.path === outcome.override.path),
  });
});
