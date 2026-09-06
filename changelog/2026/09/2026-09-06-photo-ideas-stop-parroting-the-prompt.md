# Photo ideas stop parroting the prompt

**Date:** 2026-09-06
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

The chips in the photo request sheet are generated from the conversation again,
rather than being the prompt's own example text handed back.

- `image.ideas` no longer contains a copyable example. The old prompt said
  `Write the subject of the photo, not a message. "Me and the dog on the sofa"
  or "the view from the top", never "Hey, just got home!"`. It now describes the
  form in words — a few words naming what is in the frame, written from the
  character's side, no name, no phones, no sentences — and insists every idea
  come out of the conversation rather than being invented.
- `extractIdeas` reads every `[...]` group instead of the span from the first
  bracket to the last, because a model asked for one array sometimes answers
  with three and prose in between.
- `tidy` strips a "a photo of" lead-in and a trailing full stop, and clips on a
  word boundary rather than mid-word at 60 characters.
- `isUsable` drops an idea that runs past `IMAGE.ideaMaxWords` (9), mentions the
  character by name, is about phones and screens rather than the world, or
  matches one of the three phrases the old prompt taught the model to parrot.
- `echoes` treats two ideas whose content words overlap by
  `IMAGE.ideaOverlap` (0.6) as the same idea, so four rewordings of "third
  coffee, quiet office" become one chip and the rest of the tray fills with
  something else.
- The fallback pool grew from six to twelve and is shuffled, so a tray that had
  to fall back does not look like a fixed list.
- `PhotoRequestSheet` asks for ideas every time the sheet is opened rather than
  once per session. `photoIdeas` lives in the chat store, and the sheet only
  requested when it was empty, so every open after the first showed the four
  chips generated an hour and forty messages ago.

## Why

The chips looked hardcoded because they were: two of the four were the prompt's
own examples, returned verbatim whatever the conversation said.

Measured against the live 12B local model, four turns of context, two runs each:

| Scene | Before |
|---|---|
| peaches and a silly hat | `Me and the dog on the sofa \| The view from the top of the tree \| My silly hat with some peaches \| Mom and Dad at the restaurant` |
| third coffee, quiet office | `Me and the dog on the sofa \| the view from the top \| third coffee \| the office is dead quiet` |
| snowed overnight | `Me and the dog on the sofa \| The view from the top \| Just got home from the grocery store \| A view of the street from my bedroom window` |

"Me and the dog on the sofa" led every single set. Emma has no dog. The phrase
came from the prompt, and the fallback list said "me and the dog" too, so the
canned reading held whether the model answered or not.

After, same scenes:

| Scene | After |
|---|---|
| peaches and a silly hat | `Sunlight on my desk \| The street out my window \| Peaches in my hand \| My silly hat` |
| third coffee, quiet office | `My messy desk \| The office coffee pot \| Third empty cup on my desk \| The dead quiet hallway` |
| snowed overnight | `my street, blank and white \| the view from my window \| the plate of pancakes waiting for me \| a view of the snow-covered street` |

Removing the examples also exposed what the examples had been holding back: the
model wrote whole sentences, wrote "Emma holding up her phone", answered with
three separate arrays, and returned the same photo four times in a different
word order. Those are the four filters above, in the order they were found.

## Evidence

- `bun test` in `apps/conductor`: 260 pass, 0 fail across 24 files, including a
  new `tests/photo-ideas.test.ts` (15 cases: multi-array extraction, comma
  repair, line fallback, lead-in stripping, word-boundary clipping, each reject
  rule, overlap dedupe, and a shuffled fill).
- `bunx tsc --noEmit` in `apps/conductor`: clean.
- `bunx biome check .`: 251 files, no findings.
- `bun test` in `apps/canvas`: 109 pass, 0 fail.
- Live generation against `LLM_API_URL=http://127.0.0.1:8080/v1`, four scenes ×
  two runs, before and after — the tables above.

## Follow-ups

- An instance that has customised `image.ideas` in the `prompts` table keeps the
  old wording and will keep parroting. `PARROTS` in `photo-ideas.ts` catches the
  three known phrases; resetting the prompt in the admin UI is the real fix.
