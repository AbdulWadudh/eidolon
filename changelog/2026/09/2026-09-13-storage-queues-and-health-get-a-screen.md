# Storage, queues and health get a screen

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

- `GET /api/v1/admin/storage` runs the sweep with `{ dryRun: true }` and reports
  what *would* go. `POST /admin/storage/sweep` actually deletes.
- `queue/stats.ts` reads BullMQ counts and recent jobs.
  `GET /admin/queues`, plus retry-one, retry-all-failed and remove-one.
- `GET /admin/health` serves `buildHealthReport()` behind the owner gate.
- Three canvas screens and three hub tiles.
- `QUEUE_VIEW` config: how many jobs per state to read, how many failures one
  retry-all may touch, and a poll interval.

## Why

**The dry run already existed and nothing called it.** `sweepStorage({ dryRun:
true })` has returned `{ scanned, referenced, orphans, freedBytes, skipped }`
since the sweep was written. The only caller was a six-hour timer that deletes
without asking. The screen is a route over a function that already worked — the
read path and the delete path are the same code with one flag.

The sweep button is disabled unless there are orphans **and** `skipped` is null,
so the two refusals the sweep already knows how to make — no bucket connected,
and the library naming nothing while the bucket holds objects — reach the screen
as a disabled button and a reason rather than a cheerful no-op.

**The queue view degrades rather than fails.** Redis is not running here, and
`getJobCounts` throws. `describeQueue` catches per queue and returns
`reachable: false` with zero counts, so the screen renders three unreachable
queues instead of a 500. There is a test asserting the request still answers 200
with Redis down, because that is the state the screen will most often be opened
in when something is wrong.

`characterId` is lifted out of job data where it exists, so a stuck portrait
names who it is for rather than showing an opaque job id.

**Health is served twice, on purpose.** `/health` stays public and unchanged —
canvas already uses it for capability checks and the conductor's own tooling
reads it. `/api/v1/admin/health` is the same report behind the gate, so the
dashboard reaches it through the same authenticated client as everything else
rather than the dashboard being the one screen that talks to an open endpoint.

Completed jobs are counted but not listed. A completed job is not actionable and
retention already caps them at 100; listing them would push the interesting
states off the screen.

## Evidence

`bun run lint` clean over 461 files. `bun run typecheck` green across five
packages.

`apps/conductor`: **623 tests, 623 pass, 0 fail** — 11 new in
`tests/admin-operations.test.ts`. `apps/canvas`: **234 pass, 0 fail**.

The tests assert the parts that would otherwise rot silently: a read never
deletes (`removed` empty, `freedBytes` zero); the offline bucket is reported as
`skipped: "not-connected"` rather than as a successful empty sweep; a real sweep
lands in the audit trail carrying `describeSweep`'s own summary line; the queue
request answers 200 with Redis unreachable; every queue reports a number for
every state; an unknown queue key is 404; and all three surfaces answer a member
403.

**On-device behaviour is unverified.** No handset was attached.

## Follow-ups

- The queue screen does not poll. `QUEUE_VIEW.pollMs` is classified and served
  but nothing reads it on the client yet.
- Retry-all walks failed jobs one at a time up to `maxRetryAtOnce`. BullMQ has no
  bulk retry, so a very large backlog needs several presses.
- `/health` still reports the S3 endpoint and bucket to anyone who asks. That
  predates this work and changing it would change an existing public route.
- The storage screen lists every orphan. A bucket with thousands would want
  paging.
