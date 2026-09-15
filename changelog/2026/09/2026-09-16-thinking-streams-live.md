# Thinking streams as it happens

**Date:** 2026-09-16
**Scope:** packages/config, packages/protocol, apps/conductor, apps/canvas

## What changed

**Thinking streams live.** A `reasoning_delta` server event carries each chunk
as it arrives, gated on `REASONING.showToUser`. The client accumulates it into
`streamingReasoning` and `LiveThinking` shows the tail under the streaming
bubble while the reply is still being written. It opens by default, because
watching it is the point, and collapses to its header row alone. On commit the
trace from `message_committed` wins; the streamed one is the fallback when none
arrives.

**The disclosure shares the timestamp row** rather than taking a line of its
own, flush left with no padding, the time on the right, and the trace below a
hairline rule.

**The copy follows the character's pronouns.** `CHAT_COPY.showThinking`,
`hideThinking`, `thinkingTitle` and `dismissOptions` are functions of a subject
pronoun now, read from `useAffinityStore`. `ADMIN_COPY.editAnyHint`,
`speakAnyHint` and `showThinkingLabel` were rewritten without a pronoun at all,
because an admin setting applies to every character at once.

## Why

**The trace was only visible after the reply finished.** Reasoning takes about
ten times the latency of a plain turn, and during that time the bubble said
nothing. Streaming it is the difference between a pause and a progress
indication that happens to be interesting.

**"Show what she thought" was wrong for most characters.** Pronouns are a field
on the card and the client already carries them for the active character, so
the copy had no excuse. The admin sheet is a different case: it governs every
character, so it names none of them.

## Evidence

All four packages green: config 261, protocol 37, conductor 780, canvas 295.
Typecheck clean across all four, biome clean on 47 touched files,
`check:size` clean. Four new canvas assertions cover the livestream path.

The live panel is capped at the last 560 characters over eight rows. The full
trace is on the settled bubble afterwards, so the live view only ever needs the
tail.

## A bug found after the fact

The live panel could not be collapsed. It defaulted to closed and still drew
eight rows of text in that state, so pressing it only toggled between unlimited
rows and eight — and a live trace is longer than eight rows, so both states
looked the same. The label was inverted with it, reading "Show what he thought"
while the text was already on screen. It defaults to open now, and closed means
the header row and nothing else, which is what the settled-message disclosure
already did.

## Follow-ups

- The disclosure has not been looked at on a device, only in tests.
