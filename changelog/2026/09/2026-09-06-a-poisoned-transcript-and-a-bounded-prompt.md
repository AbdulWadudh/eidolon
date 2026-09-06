# A poisoned transcript, and a prompt that cannot overrun its context

**Date:** 2026-09-06
**Scope:** apps/conductor, packages/config

## What changed

**A leaked reminder kept teaching the character it had wronged someone.** Asked
"Hi there" after a long conversation, Emma answered *"Hey stranger... I can't
believe you're still here After everything I've done to you..."* — as if meeting
again after a falling out. History was not lost: all twenty turns were in the
prompt, correctly ordered. The three turns before it were the problem:

```
15 [assistant] That was only a stage direction. Say something out loud this time…
16 [user     ] You are not suppose to say that
17 [assistant] I see your point... let's just pretend I said what you wanted me to…
```

The instruction leak fixed earlier the same day had already been written to
SQLite, and every turn since re-read it. The model saw a conversation that broke
down and an apology for something, and invented what it had done wrong.

The write-time guard stops new ones. This adds a read-time filter, because the
rows already recorded do not fix themselves: an assistant turn that trips
`leaksInstruction` is dropped before the prompt is built. `metaPhrases` also
catches the paraphrase — a character has no idea what a stage direction is, so
using the phrase at all gives the game away even when the reminder is not quoted.

**The prompt is now bounded.** `PROMPT_BUDGET.maxChars` covered the system
sections only. A typed message has no maximum length anywhere in the protocol and
`workingHistory` took twenty of them verbatim, so the real ceiling was unbounded.
Measured against the tokenizer, twenty pasted paragraphs of 2,000 characters came
to **20,698 prompt tokens**, which overruns even the 16k context in use today.

History is now taken newest first until a character budget is spent, one message
cannot eat the whole window, and the budget covers the entire prompt.

**Scene fields are capped where the cap works.** The planner is told twelve words
a field and ignores it, so `others` arrived as a clause and was pasted into a
caption: *"with Her cat, Luna, is curled up on the bed at Emma's bedroom, Emma
is"*. Fields are cut to eight words, and an `others` that reads as a clause is
dropped, because "with An empty glass jar on the counter" is worse than nothing.

## Why the budget is what it is

`-c 8192` was proposed on the grounds of speed and coherence. Measured, neither
holds here: generation is 101 tok/s at 8192 against 102-130 at 16384, and the
prompt never approached either ceiling in ordinary use. The real argument is
VRAM, 426 MiB of it, on a card where contention silently drops the model to CPU.

The ceiling is derived rather than guessed. Tokenised at 12,000 characters:

| Content | chars/token |
|---|---|
| Ordinary prose | 4.50 |
| Random letters | 1.53 |
| Arbitrary printable bytes | 1.33 |

The budget has to survive the last of those, because a pasted hash dump or a
block of minified code is exactly that. At 12,000 characters the worst case is
9,055 tokens plus a 200-token reply reserve — over 8,192. At 10,000 it is 7,719,
which fits. A test asserts the relationship, so raising the budget or lowering
the context fails the build rather than truncating a reply in production.

## Evidence

- `bun run lint`, `bun run typecheck`, `bun run check:size` — all pass.
- Conductor 318 tests pass, across 27 files.
- Against the live tokenizer, before and after:

```
                                   before    after
empty history, short message          877      877
full window at reply cap            3,373    3,373
window of 2,000-char pastes        20,898    3,131
window of 20,000-char pastes      200,898    3,131
window of 100,000-char pastes   1,000,898    3,131
```

- On Emma's real transcript: 20 rows read, 18 kept, both machinery turns dropped.

## Follow-ups

- The image message still inverts the subject: the photo is of her reaching for
  something and the text reads "I saw you reaching for something in the kitchen".
  The caption is fixed; the accompanying line is not.
- One image message was stored with empty content.
- `-c 8192` is not yet set on `stack/start-llm.bat`; the budget now supports it.
