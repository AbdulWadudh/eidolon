# Reasoning, made safe and then made optional

**Date:** 2026-09-16
**Scope:** apps/conductor, apps/canvas, packages/config, packages/protocol, stack

## What changed

**The leak guard.** `apps/conductor/src/services/reasoning.ts` holds a streaming
filter that removes a model's internal monologue from what it says out loud. It
is applied inside `streamChatCompletion`, so every caller is covered at once —
the chat path, and `chronicle-writer`, `proactive-worker` and `prompt-writer`,
all three of which already asked for thinking and had nothing stripping it.
`completeText` strips too, for the authoring path.

It handles both transports. A `reasoning_content` delta is read and discarded
rather than yielded. An inline block in `content` is removed whether or not the
opening tag ever arrives, and whether or not either tag is split across stream
chunks. It strips defensively even when thinking was never requested.

**A flag per request.** `think` on `ChatTurnSchema`, defaulting to false,
threaded through `handleChatTurn` to `ReplyOptions` on `streamReply` to the llm
options. `thinkingBudget()` is applied to the chat path only when the flag is
on. `canThink()` already gates the transport, so the flag is ignored on a
profile that cannot think. `voice-input` and `regenerate` pass false.

**The control.** A brain toggle in the existing `InputToolbar` action set, shown
only when `/health` reports `llm.canThink`. It arms one message: the store
clears `thinkNext` in the same `set` that sends the turn. `STATUS_COPY.reasoning`
is a new entry rather than an overload of `STATUS_COPY.thinking`, which is
already the ordinary pre-reply status; it rides as the `detail` of the existing
`thinking` status, so `ServerStatusEnum` is unchanged and old clients still work.

**The launcher.** `stack/start-llm.bat` now runs `--reasoning on`,
`--reasoning-format deepseek` and `--reasoning-budget 256`.

## Why

**Nothing in the conductor handled reasoning.** Turning it on without the filter
would have rendered the model's monologue as the character's dialogue and
`appendMessage` would have written it to the database, where every later turn
reads it back. The filter went into `streamChatCompletion` rather than the reply
path because three background workers already passed `think: true` and were
protected only by the server flag this change turns off.

**`--reasoning-format deepseek` is the real fix; the inline strip is the belt to
its braces.** With thinking returned in `reasoning_content` it cannot reach
`content` at all. The inline path covers a different server, a different format
setting, or a template that opens the block regardless.

**One bound is worth stating.** When a template opens inside the block, no
opening tag ever arrives, and the only way to know that the text so far was
reasoning is to see the closing tag later. The filter therefore holds the first
`REASONING.leadHoldChars` (600) of output — but only when thinking was
requested, where the user is already waiting. With thinking off it strips paired
blocks and does not hold, because holding 600 characters of every reply would
mean a short reply never streams at all. Under `--reasoning-format deepseek`
this case cannot arise.

## Evidence

`bun test` and `bun run typecheck` green in all four packages: config 260 pass
(1 pre-existing registry failure), protocol 37, conductor 775, canvas 287.
25 new conductor assertions cover the filter and the reply path; 4 new canvas
assertions cover the per-message toggle.

**Real generation, against llama.cpp on 127.0.0.1:8080**, same persona and same
user turn ("my flight got cancelled and i am stuck at the airport till
tomorrow"), sampling from the `qwen35` profile:

```
think off   prompt 122  completion  20  total  142   0.2s
            "Ugh, that's terrible news! Want to chat or just zone out for a bit?"

think on    prompt 120  completion 820  total  940   9.2s   finish_reason: length
            content: ""            reasoning_content: 2,600 chars

think on    prompt 120  completion 900  total 1020  10.2s   finish_reason: length
            content: ""            reasoning_content: 3,192 chars

think on    prompt 120  completion 4000 total 4120  45.3s   finish_reason: length
            content: ""            reasoning_content: 13,640 chars
```

**This model does not stop reasoning.** At 4000 tokens and 45 seconds it had not
closed the block on a one-line roleplay turn — it was still drafting and
re-critiquing candidate replies. `thinkingBudget()` adds `thinkingTokens` (700)
to `CHAT_TURN.maxTokens` (140), which is two orders of magnitude short. The
comment on the old `--reasoning off` line was right about the symptom and wrong
about the cause: it is not that leaving the flag on forces thinking, it is that
this merge never terminates a thought.

Two per-request caps were measured and **both are ignored** by this build:
`reasoning_budget` in the request body (900 tokens spent, unchanged) and
`reasoning_effort: "low"` (900 tokens spent, unchanged). The only lever that
works is the server flag, hence `--reasoning-budget 256` in the launcher.

The `reasoning_content` separation already works on this build even with the old
`--reasoning off`, which is why `content` came back empty rather than full of
monologue: `--reasoning-format` was already defaulting to `auto`. Setting
`deepseek` makes that explicit rather than a default that could change.

**Verified after restarting the server with the new flags.** Same persona, same
user turn:

```
think off  finish stop  prompt 122  completion  25  total 147   0.3s  reasoning     0 chars
           "Oof. That is a disaster. You know I cannot teleport, but I hope you find a comfy chair."

think on   finish stop  prompt 120  completion 277  total 397   3.1s  reasoning 1,000 chars
           "Aw, that is the worst news ever. Do you have enough snacks to survive until tomorrow?"
```

`finish_reason` is `stop` rather than `length`, and `content` is a real reply.
The 1,000 characters of reasoning land where 256 tokens predicts. `content` is
clean and the trace arrives in `reasoning_content`, so the format flag is doing
its job. Thinking costs about ten times the latency of a plain turn, which is
why the control is per message and defaults off. 277 completion tokens sits well
inside `thinkingBudget(140)` of 840, so the chat path has headroom and the
"thought itself into silence" retry does not fire.

## Follow-ups

- 256 holds for a short conversational turn. A turn that genuinely needs more
  thought will be cut off mid-thought rather than allowed to finish, which is
  the trade a fixed budget makes on a model that never stops on its own.
- `RegenerateReplySchema` has no `think`. Regenerating is the natural moment to
  want it; it was left out to keep this change to the path the brief named.
- `thinkingTokens: 700` in the `qwen35` profile is unchanged, per the constraint
  on `LLM_PROFILES`. With a server-side budget of 256 it is ample, but it is
  sized for a model that ends its own thought and this one does not.
