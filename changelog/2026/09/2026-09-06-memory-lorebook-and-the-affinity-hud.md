# Four tiers of memory, a lorebook, and a HUD you can turn off

**Date:** 2026-09-06
**Scope:** apps/conductor, apps/canvas, packages/config

## What changed

**The conductor now assembles one prompt from seven sources** instead of a persona
plus a search blob. `src/orchestrator/prompt-builder.ts` stitches, in this order:
persona → `[Character State: Affinity=n/100, Tier="…", Current Mood="…"]` →
chronicle → semantic recall → triggered lore → live web results → output
directive, then the last 20 messages verbatim and the user's turn.

The four memory tiers behind it:

| Tier | Module | Behaviour |
|---|---|---|
| 1 Working context | `prompt-builder.workingHistory` | Last 20 messages, verbatim |
| 2 Chronicle | `orchestrator/chronicle.ts` | Every 30 messages, a `summarize-chronicle` job on `gpuQueue`; last 3 chapters injected |
| 3 Semantic recall | `orchestrator/memory-manager.ts` | Turn indexed into LanceDB; top 2 hits above 0.65 injected |
| 4 Lorebook | `orchestrator/lorebook.ts` | Word-boundary keyword match, gated on `required_affinity` |

**On mobile**, the relationship is invisible by default. Insight Mode (off by
default, persisted) adds an amber ring to the avatar and swaps the mood subtitle
for `Trusted Confidant • 74/100`, and a pill reports each shift. A new Mind &
Lorebook drawer shows the affinity with an author override and lock, the
lorebook with locked secrets named but not spoiled, the chapter summaries, and
the live-web-search switch.

New tables: `lorebook_entries`, and `chronicles` rebuilt to
`(chapter_index, summary_text)`. `characters.affinity_locked` is new.

## Why

**`[` was a stop sequence, so §4.8 could never have worked.** The spec asks the
model to append `[mind_update: {...}]` to its reply. `CHAT_TURN.photoNoteOpen`
was `"["`, added so the model would stop copying the `[photo attached: …]` form
out of its own history — which also meant the stream ended at the first bracket
of any state block. Narrowed the stop to `"[photo"` / `"[Photo"`, which blocks
the leak it was written for and lets the block through.

That was not enough. `PARAGRAPH_BREAK` was also a stop, and the model puts a
blank line *before* the block, so it was still being cut off on every turn —
proven by probing the raw stream. Brevity now happens inside the loop instead: a
blank line ends the prose without ending the stream. And breaking out the moment
capture began kept the marker and threw away the JSON behind it; the loop now
waits for the block to close.

**The result is a hybrid, not a replacement.** Affinity comes from the inline
block when the model produces one and falls back to the existing
schema-constrained `appraiseTurn` call when it does not — the 8B roleplay model
emits it on some turns and not others. A live run shows all three paths:
`inline delta=0 mood=Nostalgic`, `appraisal delta=0 mood=Curious`,
`locked delta=0`. Free-text moods like "Nostalgic" only exist on the inline path;
the appraisal path is constrained to the mood enum. That is the tell.

**Recall stays quiet rather than guessing.** `llama-server` is running without
`--embeddings`, so there is no embedding endpoint. `services/embeddings.ts`
probes one, remembers the answer, and falls back to the deterministic hash
embedder. Those vectors are effectively random, which scores ~0.41 against the
0.65 threshold, so nothing is injected. That is the correct failure: silence
beats feeding the model unrelated memories. Set `EMBEDDINGS_API_URL` (or restart
llama-server with `--embeddings`) and Tier 3 turns itself on.

**The author override needed server support to be real.** A lock that only lived
in the mobile store would be overwritten by the next turn, because the conductor
computes affinity. `characters.affinity_locked` plus
`PATCH /api/v1/characters/:id/affinity` is what makes "freeze relationship
pacing" actually freeze it.

**`Date.now()` was the wrong toast id.** Two updates in the same millisecond
produced the same React key, so the pill never remounted: no exit, no
re-entrance, and no fresh screen-reader announcement. A monotonic counter fixes
it. Caught by a test, not by looking.

**Haptics had to become lazy.** Importing `expo-haptics` from the affinity store
pulled the Expo runtime into every test that touched the store graph and broke
them on `__DEV__ is not defined`. `services/haptics.ts` requires it on first use,
matching what `store/storage.ts` already does for MMKV.

## Design notes

Ran `/ui-ux-pro-max` and `/animate-expo` before building, per RULES §17 and §18.

Two things changed because of it. The affinity slider is not drag-only: WCAG 2.2
`dragging-alternative` requires a single-pointer path, so it carries
`accessibilityRole="adjustable"` with increment/decrement actions and visible
± buttons at 44pt. And the toast announces a sentence — "Trust rose by 2. Now 76
of 100, Close." — rather than the bare number a live region would otherwise read.

Motion, all gated on `useReducedMotion`: toast 200ms in / 140ms out (exit ~70% of
enter) on `ease-out` from `EASING_BEZIER.out`; ring and subtitle 200ms; the sheet
reuses the existing `ActionsSheet` pattern at `UI_MS.disclosure` so the two
sheets in the app feel like one thing. Nothing animates a layout property. One
`Haptics.impactAsync(Light)` per affinity change, only in Insight Mode, never as
the only feedback.

## Evidence

- `bun run lint` — 251 files, zero errors.
- `bun run typecheck` — 5 packages, zero errors.
- `bun run check:size` — no new file over 300 lines.
- Tests: conductor 260 pass, canvas 109 pass, config 38 pass, protocol 25 pass.
- `expo export --platform web` builds the whole app, both font families shipped.

Live end-to-end against the running conductor, real model and real search:

- `"What is the weather like in Tokyo right now?"` → statuses
  `searching → thinking → speaking → idle`, detail "Checking live web sources...",
  answered in character with live conditions. No block leaked into the reply.
- `"where did you get that pendant?"` → no search fired (no temporal marker), lore
  triggered, and the reply used it.
- `GET /characters/:id/mind` → the 95-affinity secret returned as
  `locked@Devoted` with `content: null`.
- `PATCH /characters/:id/affinity {score: 96, locked: true}` → the next turn
  reported `delta=0`, and the previously locked secret unlocked and was used.

## Not verified

**Nothing on a real device.** The HUD ring, the toast, the haptic, the slider and
the drawer are typechecked, linted and bundled, and that is all. RULES §19 puts
the APK build behind an explicit ask, so it has not been run.

## Follow-ups

- The tier ladder in `AFFINITY.tiers` puts 74 at "Close", so the subtitle reads
  `Close • 74/100`, not `Trusted Confidant • 74/100`. The names in the Stage 6
  brief were given as examples; the server ladder is the source of truth and the
  HUD renders whatever it sends. Changing the ladder is a one-line config edit if
  the five-tier naming is wanted.
- Affinity runs −100..100 server-side while the HUD and slider speak 0..100. The
  drawer reads `min`/`max` off the mind endpoint so it stays truthful, but the
  two scales should be reconciled.
- No UI writes lorebook entries yet; they are seeded through `upsertLoreEntry`.
