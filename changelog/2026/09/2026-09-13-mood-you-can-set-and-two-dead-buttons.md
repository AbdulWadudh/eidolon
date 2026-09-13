# A mood you can set, and the buttons that were never wired

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/protocol, packages/config

## What changed

- `chat_turn` carries an optional `mood`. `assemblePrompt` takes `moodOverride`
  and uses it for that turn's state directive only; nothing is written.
- `PATCH /characters/:id/affinity` accepts `mood` alongside `score` and
  `locked`, writing `current_mood` for good.
- `resolveMood` validates against `AFFINITY.moods` on both paths, so an unknown
  mood is refused rather than stored or injected.
- `MoodSheet` picks from the ten existing moods with a "just this once" switch.
  Off, it writes through the API. On, it parks the mood in `chat.pendingMood`,
  which rides along with the next turn and clears on send.
- The Insight toggle is gone from More Actions; it stays in Mind & Lorebook.
- Voice call and Selfie are live in More Actions instead of "Soon".

## Why

The toolbar's smile and mic buttons and four of the eight More Actions tiles
looked broken. They were not broken — `mood` and `voice` had **no case at all**
in the chat screen's `onAction`, and `call`, `image`, `outfit` and `moment` had
none in `handleAction`. Every other button in both surfaces did. A disabled tile
with a "Soon" badge reads as a roadmap; a tile that does nothing on press reads
as a bug. Two of them were neither: Voice call and Selfie were already built and
working, reachable from the top bar and the toolbar respectively, and the sheet
simply never routed to them. Those cost two lines each.

Mood turned out to be mostly built too. `characters.current_mood` is a real
column that already feeds every prompt through `stateDirective`. The model drives
it. So this is not a new system, it is a second writer on an existing one — which
is why the persistent path reuses the affinity PATCH rather than growing a new
endpoint, and the transient path is one optional field on the turn.

Both writers validate through the same `resolveMood`. Free text would end up
interpolated straight into the system prompt, which is an injection surface and
also just produces a worse character: the ladder's warm and cold mood lists are
what the affinity system reasons about, and a mood outside them means nothing to
it.

The Insight toggle sat in both More Actions and Mind & Lorebook, writing the same
store. Two switches for one piece of state invites them to look disagreed-with
even when they are not.

## Evidence

`bun run typecheck` and `bun run lint` green across all five packages.
`apps/canvas` 219 pass. `apps/conductor` 515 pass, up from 507, including a new
`tests/mood-override.test.ts` covering mood validation, the persistent write
leaving affinity alone, the one-turn override reaching the prompt without
touching storage, and the fallback when the override is unknown.

`apps/conductor` still fails `POST /characters/import`, identically on a clean
tree — it needs object storage, which is offline here. Not from this change.

On-device behaviour is unverified. No handset was attached.

## Follow-ups

- **Voice notes are blocked on infrastructure, not code.** `STT_API_URL` is
  unset, so `isTranscriptionConfigured()` is false and `handleVoiceInput` refuses
  every upload. The pieces already exist — `voice_input` on the wire,
  `transcribeAudio`, and `useServerSpeech` recording through `expo-audio` — and
  calls use them today. What is missing beyond the config is persisting the
  user's audio, which is currently discarded after transcription, so it could
  render as a pill on their own bubble.
- Outfit and Moment remain unimplemented and undefined. They have no conductor
  support of any kind; `outfit` exists only as a field inside the selfie prompt
  schema, which is unrelated.
