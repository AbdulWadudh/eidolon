# What she thought, kept beside what she said

**Date:** 2026-09-16
**Scope:** packages/config, packages/protocol, apps/conductor, apps/canvas

## What changed

- **`REASONING.showToUser`**, shipped off. Registered as an editable config
  group, so it appears in the admin surface and the overlay applies it without
  a restart. `openTag` and `closeTag` are marked structural on the same group —
  they are a contract with the model's template, not a setting.
- **A switch in the admin sheet**, beside the existing ones, bound to that path
  through `fetchConfig`/`saveConfigValue` exactly as the photo-announce switch
  already was.
- **`onReasoning` on `CompletionOptions`.** The filter already had the trace;
  nothing could reach it. Both transports feed the callback: a
  `reasoning_content` delta as it arrives, and the inline block once the stream
  closes.
- **`reasoning` on `ReplyOutcome`**, clipped to `REASONING.maxStoredChars`
  (4000), carried through every return path in `streamReply`.
- **A `reasoning` column on `messages`** (`0001_deep_jean_grey`, one additive
  `ALTER TABLE`), written by `appendMessage` and read back by `getTranscript`.
- **`reasoning` on the `message_committed` payload**, optional, so a live turn
  shows its trace without refetching the transcript.
- **`ThinkingDisclosure`**, a collapsed control under an assistant bubble that
  has a trace. Nothing is shown until it is pressed.

## Why

**The trace was already being captured and thrown away.** The Phase 2 filter
had to parse the reasoning out to stop it reaching the reply, which meant it
was sitting in `filter.reasoning()` with no way out. Surfacing it is a callback
and a column, not new machinery.

**It goes on the message rather than in a side channel.** A trace belongs to the
reply it produced. Storing it on the row means it survives a reload, follows the
message when it is deleted, and needs no second lookup — and the transcript
already carries per-message extras like `audioUrl` and `imageUrl`, so the shape
was there.

**Collapsed by default, per bubble.** Reasoning on this model runs to thousands
of characters of self-critique. Rendered inline it would bury the reply it
belongs to. The disclosure is one line until pressed, and each bubble decides
for itself.

**Off by default, and it only applies going forward.** With the switch off the
trace is read and dropped exactly as before, so nothing is written to the
database that nobody asked for. Turning it on does not retrofit old replies:
only turns taken with reasoning on have one at all.

**The switch is server-side, not device-side.** `canEditAnyMessage` and
`canSpeakAnyMessage` live in device storage because they change what one person
sees. This one changes what the conductor writes to the database, so it belongs
with the conductor and applies to every client at once.

## Evidence

All four packages green: config 261, protocol 37, conductor 780, canvas 291.
Typecheck clean across all four, biome clean on 40 touched files,
`check:size` clean.

Nine new assertions: five in `apps/conductor/tests/reasoning-kept.test.ts`
covering storage, the null cases and the overlay taking effect live, and four in
`apps/canvas/tests/thinking-disclosure.test.ts` covering the trace landing on
the right bubble, absent when the server sends none, and not bleeding from one
turn to the next.

The migration is a single additive column:

```sql
ALTER TABLE `messages` ADD `reasoning` text;
```

`registry.test.ts` passes for the first time in this work. It was failing on
`main` because `CHARACTER_TASTE_COPY`, `PERSONA_COPY` and `QUEUE_COPY` were
exported from `@eidolon/config` and unclassified. Adding `REASONING` to the
registry meant confronting the same test, so those three were classified as copy
groups in the same pass.

`font-mono` was written into the disclosure first and removed: no mono family is
registered in `global.css`, and §8 says a derived name that was never registered
falls back to the system font silently. It uses `font-ui`.

**The model side is verified; the rendered bubble is not.** With the server
restarted on the new flags a thinking turn returns a real reply and a 1,000
character trace in `reasoning_content`, which is what the callback reads. The
data path is covered by tests end to end. What has not been looked at is the
disclosure drawn on a device.

## Follow-ups

- Open a chat with the admin switch on and look at the disclosure on a device.
  Everything behind it is tested; how it sits under a bubble is not.
- `maxStoredChars` is 4000 against a measured 13,640-character trace, so a long
  one is truncated rather than refused. If truncation turns out to cut the
  interesting part, the end is usually worth more than the beginning.
