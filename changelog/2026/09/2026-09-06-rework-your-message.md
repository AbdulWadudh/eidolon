# Rework your message, as many times as you like

**Date:** 2026-09-06
**Scope:** apps/conductor, apps/canvas, packages/config, packages/protocol

## What changed

A wand button in the message toolbar rewrites whatever is in the input. Press it
again and it reworks the rewrite. An undo button appears beside it once there is
something to go back to, and each press walks back exactly one version until the
original draft is returned.

- `enhance_message` (client) and `message_enhanced` (server) on the socket.
- `services/enhance.ts` in the conductor, with `completeText` added to `llm.ts`.
- `enhanceHistory: string[]` and `isEnhancing` in the chat store, with
  `enhanceInput` and `revertEnhance`.
- The wand is disabled on an empty draft and while a rework is in flight; the
  undo button only exists when the stack is non-empty.

## Why

**The chat endpoint cannot do this, and that was not obvious.** Asked through
`/v1/chat/completions` to rewrite `did you get the job??`, the model replies
*"Yes, I'm thrilled to report that I did get the job!"* — it answers the draft
instead of rewriting it. Six variants were tried before the cause was clear:

| Attempt | Result |
|---|---|
| System prompt + scene context | Echoed the character's last line back |
| Draft alone, no scene | *"you haven't actually provided a draft"* |
| Delimited draft, instruction last | Leaked the `<<<DRAFT` markers |
| JSON response schema | Answered the question inside the JSON |
| Assistant prefill | Correct on statements, answered questions |
| Few-shot in the system prompt | Answered everything, and invented facts |

Two things fixed it together. First, the **raw `/completions` endpoint** rather
than chat: a roleplay finetune reads any chat turn as something to answer, and
the completion endpoint carries no such frame, so the model continues the pattern
it is shown. Second, and bigger than expected, **temperature 0.2**. Every probe
until then ran at the conversational 0.85, which is enough on its own to turn a
rewrite into a reply.

`completeText` throws `CompletionUnsupportedError` on a 404 or 501, and enhance
turns that into a plain message rather than falling back to the chat path.
Falling back would produce confident, wrong output — an answer where a rewrite
was asked for — and a clean failure is better than that.

**Scene context was dropped.** Feeding the recent transcript in for tone made the
model echo the character's last line back as the "rewrite". The draft alone is
enough, and it removes a whole class of confusion.

**Reworking twice used to fail.** A second pass over an already-polished line
comes back identical at 0.2, and identical output is rejected — so the second
press reported an error. Since reworking repeatedly is the entire point of the
button, an unusable result now retries once at `retryTemperature` 0.75 before
giving up.

**A failed rework must not leave a step on the stack.** The draft is banked
before the request goes out, so revert has somewhere to return to whatever comes
back. If the conductor answers `ENHANCE_FAILED` the client pops that entry again;
without it the undo button would appear and then do nothing the first time it was
pressed. That error is also the one server error that does *not* stop the stream
or close the suggestion tray, because a failed rewrite has nothing to do with the
turn in progress.

## Evidence

- `bun run lint`, `bun run typecheck`, `bun run check:size` — all pass.
- Tests: conductor 276, canvas 124, config 38, protocol 25 — all pass.
- 16 conductor tests cover shaping, the prompt shape and the refusal paths.
- 15 canvas tests cover the stack: five reworks in a row, revert walking back one
  version per press, revert stopping at the original, reworking a reverted draft,
  a hand edit becoming the version revert returns to, and the failure path
  leaving both the draft and the stack untouched.

Live, through the socket against the running conductor:

```
original : hey im free later if u wanna do something
rework 1 : Hey, I'm free later if you want to do something. What did you have in mind?
rework 2 : ... I was thinking we could go to the movies or grab a bite to eat. ...
rework 3 : ... I'm open to suggestions. What do you think?
revert   -> rework 2
revert   -> rework 1
revert   -> hey im free later if u wanna do something
empty draft -> refused
```

## Not verified

Nothing on a device. The wand and undo buttons are typechecked, linted and
bundled only.

## Adding an action

A share of reworks now also open the line with a stage direction, chosen by
`ENHANCE.actionChance`. It is only ever offered on a draft that has no action
already and is not a question: measured, the model asked to add an action to
"did you get the job??" answers it — *"*leans back* No, I didn't get the job"* —
where the plain rewrite correctly returns "Did you get the job?". Statements are
safe, so the dice are only rolled there.

Nudges are lifted out with `splitInfluence` before the model sees the draft and
put back afterwards. A prompt asking it to preserve `<be more affectionate>` did
not; deterministic removal and restoration does.

## Follow-ups

- Repeated passes drift. By the third rework the model is adding suggestions the
  draft never contained ("go to the movies or grab a bite to eat"). The
  instruction forbids inventing information and it does it anyway; this is what
  an 8B model does when asked to keep improving something already fine. Revert is
  the mitigation, which is why it exists.
- A worked example in the prompt is a draft someone might actually type, and
  typing one verbatim returns the canned rewrite. The examples were chosen to be
  unlikely rather than impossible.
- Rewriting always works from the current text. Offering "rework the original
  again" as a separate affordance would avoid the drift above.
