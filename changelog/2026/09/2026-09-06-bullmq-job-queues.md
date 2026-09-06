# Background work moves onto BullMQ queues

**Date:** 2026-09-06
**Scope:** apps/conductor, packages/config, docker-compose.dev.yml

## What changed

Three BullMQ queues now sit between the chat turn and the slow work it used to
block on, all sharing the Dragonfly instance the cache already uses:

| Queue | Concurrency | Why that number |
|---|---|---|
| `eidolon-gpu` | 1 | One RTX 5070 Ti. Two renders at once is an OOM, not a speedup. |
| `eidolon-s3-upload` | 4 | Network-bound, no shared device to contend for. |
| `eidolon-proactive` | 2 | LLM-bound, and a character speaking twice at once reads wrong. |

`eidolon-gpu` renders stage backdrops through ComfyUI and writes chronicle
summaries. `eidolon-s3-upload` retries media uploads five times with exponential
backoff. `eidolon-proactive` runs the delayed job that lets a character message
first after a stretch of silence.

Bull-Board is mounted at `/admin/queues`, wearing `@eidolon/tokens` through the
board's theme-token API so it is not a stock white dashboard bolted to a dark app.

New supporting pieces: a `chronicles` table and a unique
`(character_id, name)` index on `stages`; a socket registry
(`src/ws/registry.ts`) so a worker can push `stage_shift` to whichever sockets
are watching that character; `src/orchestrator/` holding the dispatch decisions.

## Why

The chat turn was doing GPU renders and S3 uploads inline. A backdrop render is
tens of seconds, and the reader spent all of it watching a socket do nothing.
Work that a reader is not waiting on belongs off the turn.

**Dragonfly needed two server-flag changes before BullMQ would run at all**, both
found by probing rather than by reading:

1. `--cache_mode=true` sets an eviction policy. BullMQ warns on connect, and it is
   right to: a queue on an evicting store can lose jobs under memory pressure.
   Cache mode was correct when SQLite was the only source of truth for everything
   in there. It is not correct now that job state lives beside it. Removed,
   `--maxmemory` raised 512mb to 1gb.
2. BullMQ's Lua scripts touch undeclared keys, which Dragonfly refuses by default:
   `ERR script tried accessing undeclared key, key: bull:probe-queue:1`. The two
   documented fixes are `--default_lua_flags=allow-undeclared-keys`, which locks
   the whole store for every script, and `--cluster_mode=emulated
   --lock_on_hashtags`, which needs hashtagged names but keeps queues on separate
   threads. Took the second and gave each queue its own hashtag prefix
   (`{eidolon-gpu}`), so the queue names stay readable in Bull-Board while
   Dragonfly still sees three distinct hashtags.

**`ioredis` is a direct dependency now.** BullMQ v6 made it an optional peer and
throws on startup without it. Bun's `RedisClient` cannot stand in: BullMQ registers
its job state machine through ioredis's `defineCommand` and needs dedicated
blocking connections. `src/services/cache.ts` still uses Bun's client, and both
read the same `getCacheUrl()`.

**Job IDs cannot contain `:`.** BullMQ v6 rejects a custom ID with a colon unless
it has exactly three colon-separated parts, which is the repeatable-job format.
`proactive:${characterId}` threw; `chronicle:${id}:${n}` would have passed
validation while colliding with a convention that is not ours. All deterministic
IDs go through `jobKey()`, which joins on `__` and strips everything outside
`[a-zA-Z0-9_-]`.

**The chronicle summariser asks for JSON.** Told in prose to write three bullets
under 160 characters, the local model continued the roleplay instead — it is
tuned for dialogue, and a transcript in a user message reads as a turn to answer.
A `response_format` schema with `maxLength` fixed it. `toBullets` still falls back
to line splitting when the model ignores the schema.

## Evidence

- `bun run lint` — 221 files, zero errors.
- `bun run typecheck` — 5 packages, zero errors.
- `bun test` in `apps/conductor` — 187 pass, 0 fail, across 19 files.
- `bun run check:size` — no new file over 300 lines.
- Bull-Board at `http://localhost:3000/admin/queues` returns 200, static assets
  serve (`main.css` 27,022 bytes, `main.js` 49,487 bytes), and
  `/admin/queues/api/queues` reports all three queues with `hasWorkers: true`.
- Delayed proactive job, end to end: scheduled with a 12,186,362 ms delay, state
  `delayed`, shortened to 1000 ms, worker completed it, and
  `*runs off to the gym*` landed in `messages`.
- Chronicle job through `eidolon-gpu`, end to end: completed, three bullets
  written to `chronicles`, each inside the character limit.

The `generate-stage-backdrop` processor has **not** been run end to end — that is
a multi-minute ComfyUI render on the shared GPU. Its upload, SQLite write and
`stage_shift` broadcast are unverified against real output.

## Follow-ups

- `queue.test.ts` runs against a `{eidolon-s3-upload-test}` prefix. Without it a
  running dev server's worker consumes the test's jobs and the test times out
  against a system that is working correctly. Any future queue test needs the
  same isolation.
- `maybeSummarizeChronicle` counts every message, so the 30-message milestone
  includes both sides of the conversation.
- The proactive delay window (45 min to 5 h) is a guess. It wants tuning against
  real reading habits.
