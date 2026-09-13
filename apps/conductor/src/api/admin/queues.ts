import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import { QUEUE_VIEW } from "@/config";
import { describeQueues, queueFor, removeJob, retryFailed, retryJob } from "@/queue/stats";

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

adminQueues.delete("/:key/jobs/:jobId", async (c) => {
  const key = c.req.param("key");
  if (!queueFor(key)) return c.json({ error: NO_SUCH_QUEUE }, 404);
  if (!(await removeJob(key, c.req.param("jobId")))) return c.json({ error: NO_SUCH_JOB }, 404);

  return c.json({ queues: await describeQueues(QUEUE_VIEW.perState) });
});
