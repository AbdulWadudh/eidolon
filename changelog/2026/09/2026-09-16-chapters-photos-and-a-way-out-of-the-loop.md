# Chapters, photos, and a way out of the loop

**Date:** 2026-09-16
**Scope:** packages/config, packages/protocol, apps/conductor, apps/canvas

## What changed

`memory.ts` and `media.ts` rewritten for a 9B, finishing the prompt inventory.
One instruction per line, the rule that matters most first, MUST and NEVER over
"should". Every output contract kept byte-compatible.

**A character's own life reaches the photo ideas.** `image.ideas` takes
`personality` now, because it only ever had a name and a transcript and was
inventing an office and a subway for a harbour pilot.

**Anything offered twice knows what it offered the first time.** Three new
prompts, each injected only when there is something to avoid:
`image.avoidIdeas` on a photo reroll, `suggestions.avoid` on a reply-suggestion
reroll, and `persona.avoidLast` when a reply is written again. Each follows the
`persona.searchContext` pattern: a separate prompt key the service renders when
it applies, so the wording stays editable rather than buried in code.

`request_photo_ideas` and `regenerate_suggestions` carry `exclude`; the client
sends what is currently on screen.

## Why

**A reroll sent a prompt identical to the one before it.** The model had no way
to know it had already suggested a coffee cup, so it suggested one again in
different words. "Make them different from each other" only ever applied within a
single set, never across presses. The fix is to say what was already offered.

**`handleReplyVariants` already did this** — it passes `avoid:
previous.assistantText`. `handleRegenerateReply` re-ran the turn blind, and the
suggestion reroll had nothing at all. They match now.

**`authorField` read the wrong examples for a visual field.** It built its
example set from `authoring.suggest` or `authoring.enhance` even when the prompt
had come from `authoring.suggestVisual` or `authoring.enhanceVisual`, so
`stripExampleLines` was checking answers that were never in the prompt and
missing the ones that were. One `templateKey()` now decides for both.

## Evidence

config 276, protocol 42, conductor 792, canvas 307, all green. Typecheck and
biome clean, `check:size` clean.

```
memory.ts  3,249 -> 3,577
media.ts   7,707 -> 7,835
```

Both grew: memory gained a rule against repeating the context back, media gained
`{{avoid}}`, `{{personality}}` and the new `image.avoidIdeas` entry.

Contracts verified against the live model: `image.scene` returns all eight
schema fields with a valid orientation, `chronicle.system` returns past-tense
bullets naming the character and "the player", `mind.outputDirective` keeps its
first six words and its exact JSON keys, so `leaksInstruction` and
`parseMindBlock` are untouched.

Rerolls measured over five presses, carrying the previous sets forward:

```
without the exclusion   boots, coffee, harbour lights, fog, mug, coffee, fog
with the exclusion      diesel generator, fried catfish, caldo verde,
                        concrete pier, coiled rope, warehouse glass at 3AM
```

The first roll still repeats, correctly: nothing has been offered yet.

## Follow-ups

- `image.editIdeas` still takes no `personality`. It describes changes to a photo
  that already exists, so it matters less, but the asymmetry is not deliberate.
- The exclusion carries the last twelve ideas. Beyond that the prompt would grow
  without bound; twelve was chosen rather than measured.
