# Config becomes a database overlay over the shipped defaults

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

- `packages/config/src/registry/` classifies **every value** the package exports:
  113 exported values, **837 leaves**, each in exactly one bucket with a reason.
- A fifth bucket, `boot-bound`, joins the four in the brief.
- `config_overrides` gains a second tenant beyond the theme. `services/config.ts`
  loads it at boot, merges it over the package defaults, and exposes
  `reloadConfig()`.
- `apps/conductor/src/config.ts` re-exports the 34 groups that hold an editable
  leaf, each wrapped by `resolvedGroup` — a Proxy that reads the overlay first
  and the shipped constant otherwise. **57 conductor files** now import those
  groups from `@/config` rather than `@eidolon/config`.
- `GET|PUT|DELETE /api/v1/admin/config`, plus `POST /admin/config/reload`.
- A canvas config screen: search, a chip per bucket, collapsed groups, typed
  controls on editable values and greyed rows carrying the reason on the rest.

## Why

### The fifth bucket

The four buckets in the brief did not cover what the call sites actually showed.
Counting consumers per export turned up the decisive fact: **roughly half of
`packages/config/src/` is consumed only by canvas** — `UI_MS` in 31 files, `CHAT`
in 19, `MIND_COPY` in 10, `CALL`, `CHAT_MS`, `PHOTO`, `AFFINITY_HUD`,
`FIELD_PADDING`, `GALLERY`, `PRESS_SCALE`. Those are compiled into the APK. A
conductor-side overlay cannot reach them at any price short of making canvas
fetch and rehydrate its config at launch — which touches ~60 files and still
only lands on app relaunch, not "without restarting".

A second group has the same shape for a different reason: `QUEUE_CONCURRENCY`,
`QUEUE_LOCK` and the retry configs are read once when the BullMQ workers are
constructed; `AUTH.minPasswordLength` and the session windows are read once
inside `betterAuth()`.

Neither is `structural` — a wrong value there breaks nothing at type level, and
the *right* value is simply unreachable. Calling them structural would have put a
false reason in front of the user, which is the one thing this screen exists to
avoid. `boot-bound` says the true thing: right value, nothing re-reads it.

### Classifications that needed the call sites, not the names

- **`AFFINITY.min` / `.max` are not editable.** The canvas ships
  `AFFINITY_HUD.scaleMax: 100` as its own constant, and the ring and progress bar
  divide by it. Changing the server's scale silently desyncs the HUD.
- **`MEMORY` is service-bound except `searchLimit`.** `embeddingDimensions`,
  `tableName` and `dimensionsFile` are captured into module consts in
  `lancedb.ts` and describe a table already indexed at 384 dimensions.
- **`IMAGE_ENCODE.format` is structural**, though `quality` and `effort` are
  editable — the format has to keep agreeing with `STORAGE.imageContentType` for
  objects already written.
- **`CHAT_TURN.userTurnStops` is editable but `LLM_PROFILES.stopTokens` is
  not.** Both are stop strings. The first is our own prompt's labels; the second
  is ChatML versus Llama-3 control tokens, fixed by the GGUF.
- **`SEARCH` and `MEMORY.searchLimit` were captured into module-level consts**
  (`const CACHE_TTL_MS = SEARCH.cacheTtlMs`). Reading them through the resolver
  is what makes them genuinely editable rather than nominally so.
- **`MOCK.aspectRatio` has zero consumers in either app.** It is dead. Recorded
  as such rather than quietly deleted.

### The resolver is a Proxy, on purpose

The alternative was a `cfg("SUGGESTIONS", SUGGESTIONS)` call at every read site,
which would have meant editing the body of 57 files rather than their import
lines, and would have been forgotten at the 58th. The Proxy makes the migration a
change of import path and nothing else, and `get` falls through to the shipped
constant whenever the overlay has no entry.

`ownKeys` and `getOwnPropertyDescriptor` come from the target, so spread and
`Object.keys` behave — there is a test for that, because it is the thing a Proxy
usually breaks.

**The known cost:** the Proxy is typed as the shipped object, so
`SUGGESTIONS.count` still has the literal type `3` while the runtime value may be
anything. Widening would ripple into every consumer. Only editable leaves can
ever differ, and nothing compares an editable leaf as a literal, but this is a
sharp edge rather than a solved problem — see follow-ups.

`services/config-overlay.ts` is split out from `services/config.ts` and holds no
database import. Without the split there is a cycle: `@/config` → services/config
→ db/overrides → db → `@/config`.

### The overlay refuses more than it accepts

`setConfigOverride` answers **404** for an unknown path, **403 carrying the
bucket's own reason** for a non-editable one, and **400** for the wrong type. A
row already sitting in the table for a non-editable path is ignored at load and
reported in `ignored`, so hand-editing the database cannot smuggle past the gate.

Secrets are listed but never valued: `SECRETS` carries `Boolean(process.env.X)`,
so the wire only ever says set or unset. There is a test asserting every
`secret` entry is a boolean.

## Evidence

`bun run lint` clean over 443 files. `bun run typecheck` green across five
packages.

`apps/conductor`: **594 tests, 593 pass, 1 fail** — 17 new in
`tests/config-overlay.test.ts`. `apps/canvas`: **234 pass, 0 fail**.
`packages/config`: **46 pass, 0 fail** — 8 new in `tests/registry.test.ts`.

The one failure is the pre-existing `POST /characters/import`, storage offline.

The registry test proves the classification is complete **in both directions**:
every non-function export of `@eidolon/config` appears in the registry, and the
registry claims no group the package does not export. Both lists must be empty.
It also asserts every leaf has a reason, every `service-bound` leaf names its
service, and every bucket is non-empty.

The overlay test proves the live-reload claim rather than asserting it: it writes
`SUGGESTIONS.count`, then reads `SUGGESTIONS.count` **through the same import a
request handler uses**, in the same process, and sees the new value — while
`SHIPPED_SUGGESTIONS.count` is unchanged. It writes a row straight to the table
behind the resolver's back, confirms the process has not noticed, calls
`POST /admin/config/reload`, and confirms it then has.

Database checked after the run: `config_overrides` is empty and no test accounts
remain.

**On-device behaviour is unverified.** No handset was attached.

## Follow-ups

- The Proxy keeps the shipped literal types. A mapped widening type would be
  more honest for editable leaves; it was not worth the ripple today.
- Canvas-only values are visible and greyed but unreachable. Making them
  genuinely editable needs canvas to fetch resolved config at launch.
- `reloadConfig()` does not rebuild the worker pool, so `boot-bound` stays
  boot-bound even across a reload. That is what the bucket says, but a future
  reload could plausibly restart workers.
- `MOCK.aspectRatio` is dead and should be deleted.
