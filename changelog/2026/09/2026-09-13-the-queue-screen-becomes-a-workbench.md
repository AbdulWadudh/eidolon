# The queue screen becomes a workbench

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

- Jobs live inside a collapsible group per queue rather than in one flat list.
- Each queue has a tab per state — **active, waiting, delayed, failed,
  completed** — with the count on the tab.
- A job opens to show its **input and output**: every field of the job data,
  the return value, the failure reason, attempts and progress.
- A **failed** job's input is editable, and can be saved or saved-and-retried.
- A prompt field carries the same suggest / enhance / revert row the character
  card uses, backed by `authoring.jobPromptWrite` and `authoring.jobPromptEnhance`.

## Why

**Job data holds things that must never reach a client.** An upload job carries
`bufferBase64` — the entire image, tens of thousands of characters. `describeInput`
walks the data and replaces anything whose key matches `QUEUE_VIEW.redactedKeys`
(`base64`, `secret`, `token`, `password`, `key`) with `"N chars, not shown"`,
truncates long strings, and counts arrays instead of listing them. There is a
test asserting a 50 000-character buffer comes back as a count and never contains
its own content.

**Only a failed job can be edited.** A waiting or active job's data changing
under a worker that is already reading it is a race with no upside. `updateJobData`
checks `await job.getState() === "failed"` and answers **409** otherwise.

**The edit merges, it never replaces.** Editing a portrait prompt on an upload
job must not drop the base64 buffer sitting beside it. The patch is applied over
the existing data, and each field is checked three ways: it must already exist,
it must not be a redacted key, and it must keep its type. A truncated string is
marked `editable: false` — saving what the screen showed would silently shorten
the real value to the preview.

**The AI row reuses the image prompt writer.** `ask()` in `prompt-writer.ts`
already carries the right system message — no first person, no asterisks, one
line of comma-separated visual phrases — and `isPromptLike` already detects when
a model answers in prose instead. `authorJobPrompt` retries across the
temperatures and refuses rather than returning prose that would fail the same way
the original did.

It is offered **only on fields matching `/prompt/i`**. Enhancing a `filename` or
a `characterId` is meaningless, and the route rejects the attempt rather than
relying on the UI not to offer it.

Completed jobs were being counted but not listed, which was wrong: `removeOnComplete`
is 100, so they are there, and a completed job is how you check what a retry
actually produced.

## Evidence

`bun run lint` clean over 467 files. `bun run typecheck` green across five
packages.

`apps/conductor`: **642 tests, 642 pass, 0 fail** — 14 new. `apps/canvas`:
**234 pass, 0 fail**. `packages/config`: **46 pass, 0 fail**.

The tests cover the parts that leak or corrupt if they rot: a base64 buffer is
never serialised; anything named like a credential is redacted; a long prompt is
truncated with its real length noted; an array is counted; a truncated field is
not editable; an unknown job or queue is 404; a body that is not a patch is 400;
a member is 403; and the prompt shaper takes one line out of a fence, a label, or
quotes.

**Not tested end to end:** editing and retrying a real failed job needs Redis,
which is not running here. The guards around it are tested; the BullMQ
`updateData` + `retry` round trip is not.

**On-device behaviour is unverified.** No handset was attached.

## Follow-ups

- `QUEUE_VIEW.pollMs` is still not read by the client; the screen refreshes only
  when asked.
- The state tabs show counts from `getJobCounts` but the job list is capped at
  `perState` (20), so a tab can read "failed 140" and list twenty.
- Editing is offered per field. There is no way to edit the whole data object as
  JSON for a job whose shape the redactor cannot flatten.
