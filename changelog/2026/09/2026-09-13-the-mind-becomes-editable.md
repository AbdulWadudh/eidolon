# The Mind becomes editable

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

- `db/chronicles.ts` gains `updateChronicle`, `deleteChronicle` and `getChronicle`.
  It previously only knew how to append.
- Six new routes under `/characters/:id`: `POST|PATCH|DELETE /chronicle`,
  `POST|PATCH|DELETE /lore`. All return a fresh `MindView` so the drawer never
  has to guess what the server now holds.
- `POST /characters/:id/chronicle/summarize` runs the existing summariser on
  demand via `summarizeChronicleNow`, which skips the milestone gate and takes
  the next free chapter index.
- More Actions gains a **New chapter** tile that calls it.
- `LoreSection` and `ChronicleSection` are editable: add, edit in place, delete
  behind a confirm. `mind/RowActions.tsx` carries the edit/delete/save/cancel
  chrome both share.
- `PRONOUN_SETS`, `pronounsFor` and `isPronounKey` land in config.

## Why

The Mind drawer was a read-only window onto state the model alone wrote. You
could watch the chronicle and the lorebook fill up and disagree with them, and
have no way to say so. Everything the model can write, a person should be able
to correct.

The lorebook was already half there: `upsertLoreEntry` and `deleteLoreEntry`
existed and worked, with nothing calling them from outside the importer. Only
routes and a UI were missing. Chronicles were genuinely append-only, so those
got real DB functions.

`updateChronicle` and `deleteChronicle` return a boolean rather than void so the
routes can answer 404 on a bad id instead of a cheerful 200 over a write that
touched nothing.

Manual summarising reuses the queue rather than calling the model inline: it is
GPU work, it already has a worker, and a request that blocks for the length of a
summarisation would time out. `chronicleJobId` had to widen to accept a string,
because the automatic path keys its job on the milestone count to dedupe, and a
manual run at the same count would otherwise collide with a queued automatic one
and silently do nothing.

`nextChapterIndex` reads `MAX(chapter_index) + 1`, so deleting the newest chapter
and summarising again refills that number rather than leaving a hole.

## Evidence

`bun run typecheck` and `bun run lint` green across five packages.
`apps/canvas` 219 pass. `apps/conductor` 524 pass, up from 515, including a new
`tests/mind-crud.test.ts` covering chapter edit-in-place, delete leaving
neighbours alone, misses reporting false, index allocation, mind-view ordering,
lore upsert-by-id not duplicating, the affinity gate surviving a round trip, and
lore deletion.

`apps/conductor` still fails `POST /characters/import`, identically on a clean
tree — it needs object storage, which is offline here. Not from this change.

On-device behaviour is unverified. No handset was attached, so the editing UI has
been typechecked and linted but not seen.

## Follow-ups

- Lore generation by the model is **not built**. The pattern exists to copy:
  `use-field-author` and `services/character-author.ts` already do LLM-assisted
  field writing for character cards.
- Pronouns are **vocabulary only**. There is still no `pronouns` column, no
  field on the card, nothing in the prompt, and 44 hardcoded female pronouns in
  `copy.ts` alone across seven config files.
- Manual summarising reports that it queued, not that it finished. The chapter
  appears when the worker lands; the drawer does not yet watch for it.
