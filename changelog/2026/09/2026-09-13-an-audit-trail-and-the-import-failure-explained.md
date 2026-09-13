# An audit trail, and the import failure finally explained

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config, packages/protocol

## What changed

- `admin_audit` records every mutation made through the dashboard: actor, method,
  path, status, timestamp and an optional detail line.
- The write happens **inside `requireOwner`**, after `next()`, not in any route.
  Reads are ignored; 401s and 403s are recorded with the rest.
- `GET|DELETE /api/v1/admin/audit`, an audit screen, and a hub tile.
- The character editor in the dashboard becomes the tabbed layout the chat
  already uses — `Identity | Mind | Voice | Misc` — with the lorebook living
  under Mind.
- `Sharing` is renamed `Misc` across both editors, as the home for anything
  without a category of its own.
- `tests/support/characters.ts` gains `wipeNamed` and now clears chronicles,
  portraits and stages as well as messages and lore.

## Why

**The audit had to be impossible to forget.** Writing it per route means the
twelfth route omits it. `requireOwner` already wraps every admin surface, and it
is the only thing that knows the actor, so it records there. A route can add
context with `c.set("auditDetail", …)` but cannot opt out of being logged.

Refusals are recorded too. A `member` repeatedly trying to delete a character is
exactly the thing an audit trail exists to show, and it is invisible if only
successes are kept. Unauthenticated attempts land with a null actor.

Clearing the log **records its own clearing**, so the log can never silently
become empty — the surviving row says who emptied it and how many rows went.

## The import failure was not what it looked like

The brief said `POST /characters/import` fails because storage is offline, and
not to chase it. It is now **passing**, and it was never a storage failure.

The test asserts the imported card lands at `marisol-vega`. Storage being offline
logs `[cards] object storage is offline; the face anchor was not uploaded` but
does not fail the import — the character is still created. What failed was the
id: a row called `marisol-vega` was already in the database, so the importer
allocated `marisol-vega-2`.

That row was there because the test's cleanup only removed ids it had seen in a
response body. When an earlier run errored before returning one, the character it
had already written stayed behind. One leak was enough to break the assertion for
every run afterwards.

Found while honouring the "remove your own rows" constraint: the database held
`marisol-vega`, created today, **zero messages**, against six real characters
created on 5–6 September carrying 14 to 202 messages each. Only the dated,
empty, fixture-named row was removed; nothing of yours was touched.

`wipeNamed` now clears by the fixture's name rather than by observed id, so a
failed import cleans up after itself. The cleanup was also dropping chronicles,
portraits and stages on the floor; it now removes those too.

**The storage warning is real and unchanged** — the face anchor genuinely is not
uploaded here. It just never was what failed the test.

## Evidence

`bun run lint` clean over 454 files. `bun run typecheck` green across five
packages.

`apps/conductor`: **612 tests, 612 pass, 0 fail** — 8 new in `tests/audit.test.ts`.
This is the first fully green conductor run in this work; the count was 603/1
before. `apps/canvas`: **234 pass, 0 fail**. `packages/config`: **46 pass, 0 fail**.

The audit tests prove the middleware placement rather than the happy path: a
mutation is recorded with no route asking; a read is not recorded; a member's
refusal is recorded at 403 with their email; an anonymous attempt is recorded at
401 with a null actor; a 404 on a missing character is recorded; and clearing the
log leaves the clearing behind.

Roster checked after the run: the six real characters, nothing else.

**On-device behaviour is unverified.** No handset was attached.

## Follow-ups

- Retention is a count (`AUDIT.retain`, 2000) pruned on every write. A time-based
  window would suit a busy conductor better.
- The audit screen pages server-side but the client only ever asks for the first
  page.
- The detail line is only set by the audit route itself. Other routes could say
  what actually changed, not just which path was hit.
