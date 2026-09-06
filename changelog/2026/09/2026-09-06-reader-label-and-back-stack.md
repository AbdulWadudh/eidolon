# She stops writing your lines, and back stops walking through your history

**Date:** 2026-09-06
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

**Every reply came back prefixed "PLAYER:".** The example dialogue on a
character card is written as a transcript, with the reader's turns labelled
PLAYER, and a small model copies whichever label it saw last as readily as its
own. `stripSpeakerLabel` already removed her name from the front of a reply; it
removes the reader's label too now.

The same cause had a second effect: nothing stopped her carrying on past her own
turn and writing the reader's reply as well, because a transcript keeps going.
`CHAT_TURN.readerTurnStops` ends the turn at a reader label on a new line.

Five replies were already recorded with the label, and history is read back on
every turn, so those rows were still teaching the pattern. The label is stripped
at read time as well, which heals turns recorded before the guard existed.

**Moving between a chat and a profile piled up screens.** Chat to profile to
chat left three entries in the stack, so the back gesture walked through
everywhere you had been rather than going where you expected. Both directions
use `router.dismissTo` now, which returns to a screen already in the stack
instead of pushing a copy of it.

The phone button in the chat header is removed. There is no call feature behind
it, and what it actually did was `router.push` the chat you were already on —
a duplicate of the current screen, every tap. Voice call is still offered as
"Soon" in the + menu, which is where the intent belongs.

## Why

The stop sequences all require a newline. A bare `PLAYER:` stop would fire on
the very first token whenever she opened a reply with the label — which is
exactly the case being fixed — and leave nothing to say.

`READER_LABEL` matches a colon only, unlike the older `PLAYER_LABEL` used for
filtering example lines. A dash is punctuation in a real line: "You — honestly,
I have no idea" is something she might write, and stripping it would eat the
sentence.

## Evidence

```
before  5 stored assistant replies beginning PLAYER: across 4 characters
```

Seven new tests: the label dropped whatever its casing, her own name still
dropped first, both dropped when the model stacks them, a real line opening with
"You —" left alone, a line merely mentioning a player left alone, and a recorded
reply cleaned when read back with no character name to go on.

Suites: conductor 398, canvas 151, config 38, protocol 25 — 612 pass, 0 fail.
Lint, typecheck and `check:size` green; `defaults.ts` reached the limit, so the
motion and presentation constants moved to `config/src/motion.ts`.

## Follow-ups

- None of it is device-verified.
- The five already-recorded replies still have the label in SQLite. It is
  stripped on read, so it cannot teach the model or reach the prompt, but the
  rows themselves are untouched and the transcript still shows it.
