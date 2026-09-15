# Storage stops hoarding

**Date:** 2026-09-13
**Scope:** apps/conductor, packages/config, RULES.md

## What changed

- `services/storage-sweep.ts` is new. `referencedKeys` reads every column that
  can hold a stored URL, `listStoredObjects` pages the bucket, and
  `sweepStorage` removes what the first set does not name.
- `startStorageSweep` runs it a minute after the bucket connects, then every six
  hours. It is wired into `index.ts` behind the `initStorage` result, so a
  conductor with no storage never schedules one.
- `STORAGE_SWEEP` in config carries the interval, the grace period, the page
  size, and the table/column list the scan walks.
- `RULES.md` §5 no longer forbids translucent glassmorphism, which the
  translucency token shipped earlier today. It now says what is actually true:
  translucency is a theme token that ships at `0`, only `GlassSurface` may honour
  it, controls stay solid, and nothing hardcodes a blur to fake it. §11's depth
  floor lost its glassmorphism clause for the same reason and gained the
  opposite point — translucency is the user's setting and carries no depth of
  its own at zero.

## Why

`deleteFile` had existed in `storage.ts` since the bucket was introduced and had
**zero callers**. Nothing removed an object, ever. Deleting a message, a
portrait, or a whole character dropped the row and left the file.

The obvious fix is to delete at each of the five sites where a row goes away.
That was rejected: references are shared. A portrait's URL is frequently also
`avatar_url` and `face_url` — `gpu-worker.ts` writes all three from one upload,
and an imported card writes the anchor to two. Deleting the portrait row would
have to ask whether anything else still points at that file, which is the same
query the sweep already runs over the whole bucket. Two mechanisms, one of them
subtly wrong, to save listing an object store that holds a few hundred keys.

Three guards, because this deletes things:

- A one-hour grace period on `LastModified`. An object is uploaded and *then*
  the row is written; a sweep landing between the two would take a live file.
- The sweep refuses to run if the library names zero keys while the bucket holds
  objects. That is a broken scan, not an empty library, and without the guard it
  would be an empty bucket.
- Key derivation cuts at `/<bucket>/` rather than matching the configured public
  URL, so rows written when the host was a different LAN address still resolve,
  and the `?v=` marker a remade voice note carries is dropped first.

## Evidence

Before: 376 objects, 202.4 MB.

```
 91 files  119.9 MB  images/<char>/emma/*        legacy layout
 57 files   62.1 MB  characters/<char>/images/*
194 files   17.1 MB  characters/<char>/audio/*
 34 files    3.3 MB  audio/<char>/*              legacy layout
```

The scan named 123 keys — 91 voice notes, 31 images, and **one** file in the
legacy `images/` layout. That single survivor among 91 is the useful signal: the
matcher is not blanket-condemning the old scheme, it is reading each row.

Of those 123, **0 were missing from the bucket**, so every reference resolved to
a real object and the derivation is right.

After: 128 objects. 248 removed, 161.8 MB. The five-object difference is the
grace period holding back what was written in the last hour. Re-running the
verification afterwards still reports 123 referenced and 0 broken links, so
nothing live was lost.

An earlier count of 251 orphans was wrong. It missed `character_portraits.url`
and `stages.backdrop_url`, and would have deleted the gallery.

`bun run typecheck` and `bun run lint` green across five packages.
`apps/conductor` 550 pass, up from 540, including `tests/storage-sweep.test.ts`
over key derivation, the cache-busting marker, a foreign host, percent-escaping,
bare keys, foreign URLs, and reference counting across messages, portraits and a
file that is both a portrait and an avatar. `apps/canvas` 227 pass.

`POST /characters/import` still fails identically on a clean tree; it needs the
storage that is offline in the test environment. Not from this change.

## Follow-ups

- The sweep deleted the 248 objects on its own before the manual run got there:
  the dev conductor hot-reloaded `index.ts` and its startup timer fired. Worth
  knowing that a restart in a dev loop is a live sweep, not a dry one.
- There is no dry-run route. The functions take `{ dryRun: true }` and nothing
  exposes it. If a sweep ever needs reviewing before it runs, that is the hook.
- Conductor tests write to the real database at `%LOCALAPPDATA%/eidolon/data`.
  84 of the 182 messages in one character's chat are test injections, and every
  run adds more. Those turns generate voice notes, so this sweep now has a
  standing supply of orphans to clean up after the tests that made them.
