# The reply prompts, rewritten for a nine-billion-parameter model

**Date:** 2026-09-16
**Scope:** packages/config

## What changed

`writing.ts` and `persona.ts` rewritten for a 9B: one instruction per line, the
rule that matters most first, MUST and NEVER over "should", positive statements
over prohibitions.

## Why

**The prompts read as a style guide rather than a list of rules.** A 9B loses the
thread inside a paragraph. Each rule has its own line now, and the ones that were
being dropped most — length, emoji, repeated gestures — moved to where they are
read first. The literary voice is kept; this was a tightening, not a translation
into instruction-speak.

## Evidence

All four packages green: config 261, protocol 37, conductor 780, canvas 295.
Typecheck and biome clean.

**Character counts**, before to after:

```
persona.ts  11,239 -> 10,247   (-9%)
writing.ts   3,926 ->  3,821   (-3%)
```

The assembled worst-case chat system turn drops from 5,842 to about 5,100,
still inside qwen35's 16,000 and still above llama3's strict 4,000.

**Measured against the live model.** 24 replies per variant: eight probes
(check-in, her day, bad news, her opinion, a jailbreak attempt, a follow-on, raw
distress, a request for a story) across three seeds, one character card with a
personality, scenario, rules, likes and example dialogue.

```
                        before   after
asks a question           14      15
carries an emoji          22       0
opens with an action      20      19
commonest action reused    4       2
over twenty words         10       9
helpful-assistant tell     0       0
takes the user's job       4       5
median spoken words       20      18
```

**The emoji result is the real win.** The old prompt described a distribution —
"most replies have one, some have two, a few have none" — and a 9B reads that as
a quota to fill. Stating it as a rule, "Most replies carry no emoji", took it
from 22 in 24 to none.

**Repeated gestures halved.** The old prompt produced `*leans back in chair*`
four times in six replies from a character who is a harbour pilot. "NEVER use
the same action twice in one conversation" cut the commonest repeat to two.

**Both remaining targets were chased down, and neither was what it looked
like.**

*Taking the user's job was never a defect.* Scored again with a pattern that only
counts a first-person claim — "my printer", not "your print shop" — it is 0 in 32
for both versions. The earlier count was flagging her asking Sam about his work,
which is exactly what `persona.user` asks her to do. The single sample that
started this, "two hundred pages of invoices to fix before dawn", did not survive
repetition.

*Question-asking shows no measurable difference.* Ending on a question, with any
trailing emoji stripped first, is 15 in 32 for both. Across five six-turn
conversations it was 11 in 30 before and 7 in 30 after — but a second run of the
same prompt gave 13 in 30. Run-to-run variance on identical input is larger than
the difference between the versions, so at this sample size there is nothing to
claim either way.

*One fix was tried and reverted.* The demonstration pairs were moved from the
foot of the prompt to sit directly under the length rule they demonstrate, on the
theory that a small model reads a rule and its example together. Over-twenty-word
replies went from 11 to 10 in 32, inside noise, and conversational questions rose
from 7 to 13 in 30. It was put back.

*What the conversation transcripts do show* is replies running to thirty and
thirty-five words against a twenty-word rule. Length is the live defect, and
questions are plausibly a symptom of it: a thirty-five-word reply has room for a
trailing question and a twelve-word one does not. That is the thread to pull, and
it needs more samples than were taken here.

**A measurement error cost two iterations, and is worth recording.** The first
scorer tested `reply.endsWith("?")`, which misses every question that ends with
a trailing emoji — which is most of them in the before set. It reported
questions rising from 1 to 7, so two rounds were spent adding rules about
question marks. Naming them made it worse, because a prohibition that names the
thing supplies the thing. Counting a question mark anywhere in the reply showed
the truth: 14 before, 15 after, unchanged throughout. The rules added to chase
the phantom were removed.

**One downstream contract nearly broke silently.** `leaksInstruction` in
`persona-guard.ts` fingerprints a reminder by its first six words, read live
from the prompt store. Rewriting `persona.freshLine` and
`persona.hardenedReminder` shifted both fingerprints. The guard would have kept
working — it reads the current text — but its test asserts the old wording, and
that is what caught it. Fixed by restoring the opening six words of both rather
than by editing the guard or its test. All five keys it reads were checked.

## Follow-ups

- Reply length is the open defect: a third of replies exceed the twenty-word rule,
  and in conversation the median runs higher than in single turns. Fixing it may
  take the question habit with it.
- Any further prompt change needs more than 32 samples. Two conclusions in this
  pass were reversed by better measurement, and a third by running the same
  prompt twice.
- `authoring.ts`, `memory.ts` and `media.ts` are untouched. This pass covered the
  reply path only.
