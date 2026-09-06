# Six women, a voice each, and a roster to reach them

**Date:** 2026-09-06
**Scope:** apps/conductor, apps/canvas, packages/config

## What changed

**Six written characters**, each with personality, scenario, rules, example
dialogue, a greeting, a Kokoro voice and two or three lorebook entries gated at
different levels of trust: Ines the baker (loyal), Nadia the subtitler
(sarcastic), Cass the bartender (flirty), Halima the photographer (guarded),
Wren the surgeon (driven) and Marguerite the clockmaker (whimsical).

`POST /characters/presets/:key` creates one, writes her lore, and queues her
portrait on `gpuQueue`. She is usable the moment the request returns; her face
lands a minute later.

**Voice selection.** `GET /voices` serves the Kokoro catalogue parsed into name,
gender, language and quality grade, recommended first. `GET /voices/:id/preview`
returns a spoken sample. A character stores her own `voice` and the turn speaks
in it rather than the one default everybody shared.

**A roster.** The home screen listed one hardcoded character and pushed to
`/chat/emma`. It now reads `GET /characters`, refreshes when the screen regains
focus so a background portrait appears on its own, and offers a create screen
with the presets, the full card form and the voice picker.

## Why

**The presets are the point, not a convenience.** Both characters on this machine
had empty personalities, so every reply came from the generic fallback. A
creation form fixes that only if someone fills it in. Six written characters mean
the first thing a new reader meets is authored.

**Testing the presets found three defects in them.** Written and shipped blind,
these would all have been live:

| Preset | Reply | Fault |
|---|---|---|
| flirty | "Cass leans against the bar, arms crossed." | third person |
| guarded | "Halima: *nods* That sounds rough." | own name as a label |
| flirty | "For you? Tragically available." | her example, verbatim |

All three come from the example dialogue being a transcript, which is the format
that teaches voice best and the format the model copies most literally. Since the
examples are worth keeping, the copying is caught instead:

- `stripSpeakerLabel` removes a leading `Halima:` or `Dr Wren Abara -`.
- `narratesInThirdPerson` catches a reply that opens with her own name and a verb,
  and asks for the line again.
- `exampleLines` feeds her own sample lines into the repetition guard that already
  existed for history, so reciting them counts as repeating herself.

**A fourth defect surfaced while fixing those.** `[mind_update: {...}]` reached
the reader as prose, because `sayItOutLoud` runs its own stream and never went
through the mind tail filter. Every other path did. It is stripped there now.

**Voices are graded because most of them are poor.** Kokoro publishes a grade per
voice and only a handful reach B or better out of sixty-eight. Sorting by grade
puts the five usable ones first instead of leaving them alphabetically buried
among sixty others.

## Evidence

- `bun run lint`, `bun run typecheck`, `bun run check:size` — all pass.
- Conductor 342 tests across 29 files; canvas 124; all pass.
- `expo export --platform web` builds with the new screens.
- Live: created all six presets, held a turn with four of them, confirmed each
  keeps first person with no label and no recited example.
- Live: `GET /voices` returned 68 voices across 9 languages with `af_bella` and
  `af_heart` first; a preview returned 61 KB of MP3.
- Live: a portrait rendered and uploaded in about 16 seconds, 832x1216.

## Not verified

Nothing on a device. The roster, the create screen and the voice picker are
typechecked, linted and bundled only.

## Follow-ups

- A portrait job queued against a conductor that has not restarted since the job
  type was added fails with "Unknown GPU job". It is a stale process rather than
  a bug, but the failure gives no hint of that.
- Asked "what happened to your wrist", a character answered about the reader's
  wrist. The same subject inversion still affects photo messages.
- There is no edit screen. The roster's edit button opens the chat.
- `greeting` is stored and still reaches nothing: no code opens an empty chat
  with it.
