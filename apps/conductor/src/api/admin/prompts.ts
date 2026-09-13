import { AdminPromptPutSchema } from "@eidolon/protocol";
import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import { describePrompt, listPrompts, resetPrompt, setPrompt } from "@/prompts/store";

export const adminPrompts = new Hono<OwnerEnv>();

function known(key: string): boolean {
  return describePrompt(key).description.length > 0;
}

adminPrompts.get("/", (c) => c.json({ prompts: listPrompts() }));

adminPrompts.get("/:key", (c) => {
  const key = c.req.param("key");
  if (!known(key)) return c.json({ error: "No such prompt." }, 404);
  return c.json({ prompt: describePrompt(key) });
});

adminPrompts.put("/:key", async (c) => {
  const key = c.req.param("key");
  if (!known(key)) return c.json({ error: "No such prompt." }, 404);

  const parsed = AdminPromptPutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Body must be { value: string }." }, 400);

  try {
    return c.json({ prompt: await setPrompt(key, parsed.data.value) });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Invalid prompt." }, 400);
  }
});

adminPrompts.delete("/:key", async (c) => {
  const key = c.req.param("key");
  if (!known(key)) return c.json({ error: "No such prompt." }, 404);

  return c.json({ prompt: await resetPrompt(key) });
});
