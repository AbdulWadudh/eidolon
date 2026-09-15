# "The model had nothing to offer for that one" was a missing space

**Date:** 2026-09-16
**Scope:** apps/conductor

## What changed

`buildAuthorPrompt` ends the prompt with `Write the Outfit: ` rather than
`Write the Outfit:`. One trailing space.

## Why

Every worked example in the authoring templates reads `Write the Outfit: `
followed by the answer on the same line — colon, space, answer. The live prompt
ended at the colon, so the model had to produce that space itself. A newline is
very nearly as likely a next token, and for a single-line field the stop list is
`[NEWLINE, "Current:", "Field:"]`. The generation halted having produced nothing.

`authorField` then tried the next temperature, and the next, and when all three
came back empty it raised "The model had nothing to offer for that one."

It hit visual fields hardest because every one of them is `singleLine`, so every
one of them stops on a newline. Outfit, Place, Photo and Portrait failed at all
three temperatures.

## Evidence

Measured against the live model, sixteen field-and-mode combinations, three
temperatures each, using the real prompt assembly:

```
                         empty attempts   fields failing at every temperature
without the space          24 of 96          4 of 16 in one run, 0 of 16 in another
with the space              0 of 48          0 of 16
```

The probe was unseeded, so the run-to-run figure moves. The direction does not:
no attempt returned empty with the space present, in 48 tries.

The four that failed outright without it were Outfit, Place, Photo and Portrait,
plus Outfit again when rewriting. Those are exactly the `singleLine` visual
fields.

Regression test added: the assembled prompt must end in a colon and a space for
every field. `character-author.test.ts` already asserted
`prompt.trimEnd().endsWith("Write the Tagline:")`, which still passes, because
`trimEnd` removes the very character that was missing — which is why the existing
suite never caught this.

conductor 781 pass, config 261, protocol 37, canvas 295. Typecheck and biome
clean.

## Follow-ups

- `authorField` computes its example set from `authoring.suggest` or
  `authoring.enhance` even when the field is visual and the prompt actually came
  from `authoring.suggestVisual` or `authoring.enhanceVisual`, so
  `stripExampleLines` is checking the wrong answers for visual fields. Harmless
  today, wrong on its face.
- The stop list still omits `userContextLabel`, recorded on the previous change
  set and left alone.
