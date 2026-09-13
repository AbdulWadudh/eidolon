import { Hono } from "hono";
import { buildHealthReport } from "@/api/v1";
import type { OwnerEnv } from "@/auth/guard";

export const adminHealth = new Hono<OwnerEnv>();

adminHealth.get("/", async (c) => c.json(await buildHealthReport()));
