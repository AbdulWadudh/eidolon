# Chronicle controls, and three holes closed

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

- `GET /admin/characters/:id/operations` reports message count, chapter count and
  the pending proactive message. `POST …/summarize` writes a chapter now.
  `DELETE …/proactive` cancels the message they were going to send unprompted.
- A `CharacterOperations` panel in the character editor's **Misc** tab.
- The gallery's delete now asks first.
- **Changing a role revokes that account's sessions.**
- **`/api/v1/prompts` is gated.** The path is unchanged; it now requires an owner.
- The health screen shows what each service is actually using — the GGUF on the
  LLM endpoint, the ComfyUI checkpoint and its dimensions, the Kokoro voice, the
  Whisper model, the embedding model and LanceDB's dimensions.
- Prompt categories are collapsed by default and carry an icon each.
- Character rows show their portrait.

## Why

**Demoting an owner used to change nothing until their token expired.** The role
was written, the gate read the new role on the next request — but the session
that had been issued while they were an owner stayed valid for up to thirty days,
and `ownerFor` resolved it against the *current* role only on a fresh lookup. In
practice the hole was narrower than it looks, but "you are no longer an owner"
should not be a statement about the future. `setUserRole` now deletes that user's
sessions, and only when the role actually differs — writing the same role back is
not a reason to sign someone out. Two tests cover exactly that pair.

This immediately broke two existing tests, which is the point: they had cached a
member's token across a role change and were still using it. The tests were wrong,
not the behaviour.

**`/api/v1/prompts` was open to anyone who could reach the port.** It was left
alone earlier because it predates this work and nothing calls it — canvas has
zero references. That made it safe to move, not safe to leave: an unauthenticated
`PUT /api/v1/prompts/persona.system` rewrites the instruction every character
runs on. It is now behind `requireOwner` at the same path, so nothing that
worked for an owner has changed.

**Service detail is on the gated route only.** `buildHealthReport()` is served at
the public `/health`, and adding model names, endpoints and checkpoints there
would widen what an unauthenticated caller learns. `/api/v1/admin/health` returns
the same report plus a `details` map assembled from server config, so the
dashboard gets the detail and the public route is untouched.

**Cancelling a proactive message is possible because its job id is
deterministic.** `proactiveJobId(characterId)` already existed so that scheduling
a new follow-up could replace a pending one; the same key finds it for a read or
a cancel. Both calls are wrapped in a catch that returns null or false, because
Redis is frequently not running and a dashboard panel must not throw when it is.

## Evidence

`bun run lint` clean over 463 files. `bun run typecheck` green across five
packages.

`apps/conductor`: **628 tests, 628 pass, 0 fail**, run three times.
`apps/canvas`: **234 pass, 0 fail**. `packages/config`: **46 pass, 0 fail**.

Database checked after the run: six real characters, one account, **zero** audit
rows — the tests that record admin mutations now clear the log they wrote.

**One flake observed, not reproduced.** During this work `suggestions.test.ts`
"falls back rather than letting prose be repaired into options" failed twice at
5016 ms against a 5 s budget, while the whole suite was taking 13 s instead of
its usual 6. It passed 3/3 in isolation and 3/3 in the full suite afterwards at
5.5–6.6 s. The slow runs coincided with lint and typecheck running alongside. It
is a timing-sensitive test near its limit rather than a new fault, but it is
recorded here rather than dismissed.

**On-device behaviour is unverified.** No handset was attached.

## Follow-ups

- The `suggestions.test.ts` budget is 5 s against an offline endpoint. It should
  either mock the endpoint or take its timeout from `TIMEOUTS_MS`.
- Cancelling a proactive message does not stop the next one being scheduled on
  the following reply. That is the intended behaviour but there is no way to mute
  a character permanently.
- The operations panel reads its counts once when the tab opens.
