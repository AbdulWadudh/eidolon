import { isAuthorMode } from "@eidolon/config";
import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import { QUEUE_VIEW } from "@/config";
import {
  describeQueues,
  queueFor,
  removeJob,
  retryFailed,
  retryJob,
  updateJobData,
} from "@/queue/stats";
import { AuthorUnavailableError } from "@/services/character-author";
import { authorJobPrompt, isAuthorableField } from "@/services/job-author";

export const adminQueues = new Hono<OwnerEnv>();

const NO_SUCH_QUEUE = "No such queue.";
const NO_SUCH_JOB = "No such job.";

adminQueues.get("/", async (c) => c.json({ queues: await describeQueues(QUEUE_VIEW.perState) }));

adminQueues.post("/:key/retry", async (c) => {
  const key = c.req.param("key");
  if (!queueFor(key)) return c.json({ error: NO_SUCH_QUEUE }, 404);

  const retried = await retryFailed(key, QUEUE_VIEW.maxRetryAtOnce);
  c.set("auditDetail", `retried ${retried} failed jobs on ${key}`);

  return c.json({ retried, queues: await describeQueues(QUEUE_VIEW.perState) });
});

adminQueues.post("/:key/jobs/:jobId/retry", async (c) => {
  const key = c.req.param("key");
  if (!queueFor(key)) return c.json({ error: NO_SUCH_QUEUE }, 404);
  if (!(await retryJob(key, c.req.param("jobId")))) return c.json({ error: NO_SUCH_JOB }, 404);

  return c.json({ queues: await describeQueues(QUEUE_VIEW.perState) });
});

adminQueues.patch("/:key/jobs/:jobId", async (c) => {
  const key = c.req.param("key");
  const jobId = c.req.param("jobId");

  const body = (await c.req.json().catch(() => null)) as {
    data?: Record<string, unknown>;
    retry?: unknown;
  } | null;

  if (!body || typeof body.data !== "object" || body.data === null) {
    return c.json({ error: "Body must be { data }." }, 400);
  }

  const outcome = await updateJobData(key, jobId, body.data);
  if (!outcome.ok) return c.json({ error: outcome.error }, outcome.status);

  const fields = Object.keys(body.data).join(", ");
  c.set("auditDetail", `edited ${fields} on ${key}/${jobId}`);

  if (body.retry === true) await retryJob(key, jobId);

  return c.json({ queues: await describeQueues(QUEUE_VIEW.perState) });
});

adminQueues.post("/:key/jobs/:jobId/author", async (c) => {
  const key = c.req.param("key");
  const queue = queueFor(key);
  if (!queue) return c.json({ error: NO_SUCH_QUEUE }, 404);

  const job = await queue.getJob(c.req.param("jobId"));
  if (!job) return c.json({ error: NO_SUCH_JOB }, 404);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isAuthorMode(body.mode)) return c.json({ error: "Unknown mode." }, 400);

  const field = typeof body.field === "string" ? body.field : "";
  if (!isAuthorableField(field)) {
    return c.json({ error: "Only a prompt can be written for you." }, 400);
  }

  const held = (job.data ?? {}) as Record<string, unknown>;
  const draft = typeof body.draft === "string" ? body.draft : String(held[field] ?? "");

  try {
    return c.json({ text: await authorJobPrompt(draft, body.mode) });
  } catch (error) {
    if (error instanceof AuthorUnavailableError) return c.json({ error: error.message }, 503);
    throw error;
  }
});

adminQueues.delete("/:key/jobs/:jobId", async (c) => {
  const key = c.req.param("key");
  if (!queueFor(key)) return c.json({ error: NO_SUCH_QUEUE }, 404);
  if (!(await removeJob(key, c.req.param("jobId")))) return c.json({ error: NO_SUCH_JOB }, 404);

  return c.json({ queues: await describeQueues(QUEUE_VIEW.perState) });
});
