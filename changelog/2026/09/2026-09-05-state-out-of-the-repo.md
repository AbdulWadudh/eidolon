# State and media leave the repository

**Date:** 2026-09-05
**Scope:** apps/conductor

## What changed

- `apps/conductor/src/utils/paths.ts` resolves an OS-level data directory —
  `%LOCALAPPDATA%\eidolon\data` on Windows, `~/.eidolon/data` elsewhere — and
  creates it on first use. `SQLITE_DB_PATH` and `LANCEDB_DIR_PATH` are derived
  from it.
- `src/db/index.ts` and `src/services/lancedb.ts` open those paths instead of
  `data/sqlite` and `data/lancedb` under the checkout. The SQLite location is
  printed on startup.
- `DATABASE_URL` is gone from `.env` and `.env.example`. It pointed at a
  repo-relative path, so leaving it in place would have silently reinstated the
  problem for anyone who copied the example file.
- `apps/conductor/data/` was deleted. The SQLite file, its WAL, and the LanceDB
  table were copied to the new location first.
- `src/services/storage.ts` talks to an S3-compatible bucket through
  `@aws-sdk/client-s3`: `initStorage`, `uploadFile`, `uploadImage`,
  `uploadAudio`, `deleteFile`. Endpoint, bucket and credentials come from
  `S3_*` environment variables; no host is baked into the source, and
  `missingStorageConfig()` names anything absent.
- `initStorage()` runs on boot (skipped under `NODE_ENV=test`), and `GET /health`
  now reports `storage` and `databaseLocation`.
- `SEARXNG_URL` lost its hardcoded fallback too. Unset now means "no search
  backend for this deployment" and `searchWeb` returns early, rather than the
  conductor quietly querying a host the operator never chose.
- `apps/conductor/tsconfig.json` maps `@/*` to `./src/*`, matching the canvas
  app. Every cross-module import in `src/` and `tests/` now uses it, so moving a
  file no longer means rewriting `../../` chains.
- New tests: `tests/storage.test.ts` and `tests/db.test.ts`.

## Why

Databases inside the working tree meant a reclone or a `git clean -xdf` deleted
every character, message and memory on the machine. `.gitignore` kept them out of
history but did nothing to keep them alive. Ownership belongs to the OS user
account, not to the checkout, and moving them there makes the repository
disposable — which is the only state a repository should ever be in.

Media has the same problem plus a second one: binaries in git are permanent even
after deletion. The bucket serves anonymous reads, so the phone fetches a URL
directly instead of the conductor proxying bytes or minting pre-signed URLs on a
mobile connection's timescale.

## Evidence

- `bun run test` — 55 pass, 0 fail (15 in `packages/protocol`, 40 across 8
  files in `apps/conductor`).
- `bun run typecheck` — clean across all five workspace packages plus the root
  project.
- `biome check apps/conductor` — clean. Repo-wide `bun run lint` still reports
  38 pre-existing formatter errors in `apps/canvas`, `scripts/` and the root
  configs; see the follow-up below.
- Live round trip against the configured bucket: `initStorage()` returned
  `true`; `uploadImage` and `uploadAudio` wrote objects that then returned
  `200 image/webp` and `200 audio/mpeg` to an unauthenticated `fetch`;
  `deleteFile` removed them (confirmed `404` after the edge cache was bypassed).

## Rejected and learned

**Applying the public read policy only on `CreateBucket`.** That was the original
shape, and it left the live bucket returning `403` to anonymous reads: the
bucket outlives the process, so `HeadBucket` succeeds and the create branch never
runs. The bucket had been provisioned by hand and carried `NoSuchBucketPolicy`. `PutBucketPolicy` is now re-applied on every boot, and a
failure there is a warning rather than a failed init — the bucket is still
writable, only anonymous reads are at risk.

**`forcePathStyle` is not optional** for a host without wildcard DNS for bucket
subdomains, which covers most self-hosted gateways. With virtual-host addressing
every request resolves to `<bucket>.<host>` and fails to connect.

## Follow-ups

- `bun run lint` cannot pass on Windows as configured. `core.autocrlf` is `true`
  and there is no `.gitattributes`, so every checkout rewrites LF to CRLF while
  Biome's formatter requires LF. A clean tree fails with 45 errors before any
  edit. The fix is a `.gitattributes` with `* text=auto eol=lf` plus one
  renormalisation commit, which touches ~20 unrelated files and so was left for
  the owner to schedule.

- Cloudflare sits in front of the bucket with `Cache-Control: max-age=14400`, on
  200s and 404s alike. Re-uploading under a key that was already fetched serves
  stale bytes for up to four hours, so generated media should use unique or
  content-addressed filenames rather than overwriting `portrait.webp`.
- `initStorage()` is fire-and-forget on boot. A `/health` scrape in the first
  second of process life can still read `storage.status: "offline"`.
- Nothing calls `uploadImage`/`uploadAudio` yet — ComfyUI output and TTS still
  need to be routed through them.
