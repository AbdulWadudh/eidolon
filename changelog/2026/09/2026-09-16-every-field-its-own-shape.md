# Every authored field gets its own shape

**Date:** 2026-09-16
**Scope:** packages/config

## What changed

All 25 `guidance` strings in `AUTHOR_FIELDS` rewritten from a description of the
field into a specification of its form: how long, which person, which tense, and
what never to include. A greeting now says it is spoken to the user; a chapter
says two to four lines with one beat each and both people present; a lore entry
says one fact, naming a thing rather than a feeling.

The four authoring prompt headers rewritten for a 9B: one instruction per line,
the rule that matters most first. `authoring.enhance` gained the three rules it
was missing — carry every fact into the rewrite, follow the Shape even when the
current text does not, and never repeat a line already written.

`label`, `maxTokens`, `maxChars`, `singleLine` and `visual` are untouched, as are
the worked example blocks in the templates.

## Why

**`guidance` is the whole per-field lever and it was doing half the job.**
`buildAuthorPrompt` renders it as `Shape: <guidance>` and nothing else in the
prompt says what shape the answer takes. Written as a description of the field,
it left the model to guess the form, which is why a greeting came back addressed
to a ship captain and a chapter came back as one prose paragraph with the user
absent from it.

**The worked examples had to stay byte-identical.** `withoutFieldExamples` strips
the example block whose `Field:` line matches the current label, so the labels
must match `AUTHOR_FIELDS[x].label` exactly, and `character-author.test.ts` pins
the answers `Tarek Mansour`, `mid-book` and `Never uses emoji.` by content. The
rewrite went into the headers and the guidance, not the examples.

## Evidence

config 261, conductor 780, canvas 295, all green. Typecheck and biome clean.
`prompts/authoring.ts` 8,934 to 9,431 characters and `authoring.ts` 9,798 to
10,100. Both grew, because form takes more words than description: 4,512
characters of guidance now carry length, person, tense and exclusions for 25
fields.

Generated against the live model, same card and same drafts:

```
Rules, rewriting "never lies, doesnt do small talk"
  before   never lies / doesnt do small talk / never lies / doesnt do small talk
  after    Always speaks the truth, no matter how blunt. Never wastes time on small talk.

Greeting, written fresh
  before   *Taps the radio mic twice.* You'll be in the channel in a minute.
  after    I check the tide twice. You bring the papers, or you bring nothing.

Chapter, written fresh
  before   one prose paragraph, the user absent from it
  after    three lines, one beat each, both people in it

Lore entry, written fresh
  before   ...carries the heat of a thousand ports, and the smell of diesel
  after    The tide turns exactly at the bell at the old church on the quay.
```

The looping rewrite is the one worth naming: the old header never told the model
not to repeat itself, and on a multi-line field it emitted the draft twice
unchanged.

## An idea that was tried and removed

The brief asks for a short example wherever a shape is easier shown than
described, so 22 of them were added to `guidance` as a trailing "Like this:"
clause. They were measured and taken out.

They were copied verbatim in three of ten cases: the greeting, the personality
and the scenario came back as the example with the names changed. Worse, on a
single-line field the clause ends in a complete answer, and the model read the
field as already written and emitted a newline — which is the stop token — so
the tagline rewrite returned nothing at all at two of its three temperatures.

The machinery that defends against a copied example, `exampleAnswers` feeding
`stripExampleLines`, reads the prompt template and not the guidance, so nothing
would have caught it. An example belongs in a template block where that machinery
can see it, or nowhere.

## Follow-ups

- `authorField` stops a multi-line generation on `contextLabel` but not on
  `userContextLabel`, so a persona field can run past its answer into an invented
  next block. Seen once in testing: a personality rewrite continued into "What
  they have written about themselves so far: Name: Elias Thorne". The fix is one
  entry in the stop list in `services/character-author.ts`, left alone here
  because that file is not this change set's to edit.
- `memory.ts` and `media.ts` are still untouched.
