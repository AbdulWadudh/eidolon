# Writing a character with help, rendering her face on demand, and doing something with her pictures

**Date:** 2026-09-06
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

**Every field of a character card now has a sparkle and a wand.** The sparkle
writes the field from whatever else you have already written; the wand rewrites
what you typed. An undo appears beside them once either has been used and walks
back one version per press, the same contract the message rework button has.
Both are on the create screen and in her settings.

`POST /api/v1/characters/author` takes `{ field, mode, draft, context }` and
returns `{ text }`.

**Her portrait can be re-rendered on demand**, from the Identity section of her
settings: the same job that runs when a character is first created, plus an
optional line of your own. The request queues and the new face is picked up by
polling her look, because the render is minutes of GPU time.

**Gallery pictures now do something.** The viewer carries the same actions the
chat's photo viewer offers — profile picture, her face, chat background, save,
delete — plus **Find it in the chat**, which opens the conversation and scrolls
to the message the photo arrived in. A portrait or a backdrop gets the subset
that makes sense: there is no message to go back to and nothing to delete.

**The roster showed uncropped avatars.** The chat header framed her using the
saved crop while the roster and her settings squeezed the whole picture into a
circle. The crop now travels with her from the roster query, and the maths lives
in one place instead of being a private function of the chat header.

**Two chat defects, neither of them new.** A caption could read "with None, just
me at the kitchen of my home" — the planner answers "who else is in the frame"
with "None, just me" as often as with "None", and the check was an exact match.
And she wrote stage directions in square brackets — "[Ines Vaz's phone rings,
she answers it] Alright, let me take this." — which read as a script rather than
as her; those are converted to the `*asterisk*` form the app uses. `[` cannot be
a stop sequence, because the state block that closes a turn opens with one, so
the shape is corrected after the fact.

## Why

Getting a local 8B to write a card field took four rounds of measurement, and
every fix was deterministic rather than a reworded instruction:

1. **Asked for a tagline, it wrote a greeting.** The last worked example in the
   prompt was a greeting. Whatever sits nearest the cue wins, so the field being
   asked for is now the last thing said, and the cue names it: `Write the
   Tagline:` rather than `Write:`.
2. **Asked for a name, it returned the example's name.** Worked answers are now
   collected from the template and an answer that only repeats one is refused.
3. **Asked for rules, it returned two of the example's lines and one of its
   own** — which the whole-block check passed. Rejection is per line now.
4. **It still copied the tagline example at every temperature**, so the guard
   left nothing and the request failed. The same-field example is now dropped
   from the prompt entirely: with no same-shape answer in front of it the model
   has to write one, and the remaining examples still establish the format.

Two more bounds came out of the same runs. Rewriting is now cold (0.35) where
suggesting is warm (0.8) — at 0.85 a rewrite of "we live in the same building"
invented a father who cleans an office. And a rewrite may not grow past three
times the draft, which is the only part of "did not invent anything" that can be
checked without another model.

## Evidence

```
name     suggest, context "a Portuguese cellist"  -> Maria dos Santos
tagline  enhance "she is a radio host at night"   -> before: failed every attempt
                                                     after:  a real rewrite
scenario enhance "we live in the same building"   -> bounded, no invented father
```

23 new conductor tests in `tests/character-author.test.ts` cover the context
build, the prompt shape, dropping the same-field example, recognising the
prompt's own answers, shaping, and every refusal. Five more cover the two chat
defects: `whoElse("None, just me")`, and brackets converted while the state
block and photo note are left alone.

Suites: conductor 389, canvas 146, config 38, protocol 25 — 598 pass, 0 fail.
Lint, typecheck and `check:size` green; the authoring route moved to
`api/authoring.ts` and the settings body to `CharacterSettingsBody.tsx` to stay
under the limit.

## Follow-ups

- None of it is device-verified.
- Suggestion quality for the long prose fields is variable on an 8B — the
  guards stop it being wrong, not dull. Re-rolling is the answer, which is why
  the button is always there.
- "Find it in the chat" scrolls to the message but does not highlight it.
- The gallery's kind filter chips are still written and unused.
