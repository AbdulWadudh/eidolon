# One portable prompt set, and the test that enforces it

**Date:** 2026-09-16
**Scope:** packages/config, apps/conductor

## What changed

- **A portability test** over all 42 prompts, in
  `packages/config/tests/prompt-portability.test.ts`. It asserts four things for
  every entry and every variant: no vendor chat token in the text, no reasoning
  scaffolding in the text, `{{var}}` and `variables` parity in both directions,
  and that the assembled chat system turn fits every profile in `LLM_PROFILES`
  rather than only the active one. The default profile is held to the strict
  rule that scaffolding may not eat the conversation budget; every other profile
  is held to its hard context ceiling.
- **`byProfile` on `PromptDefinition`.** A sparse `Partial<Record<LlmProfileKey,
  string>>` for the prompt that is one day proven to need a per-model variant.
- **`portableValue()` in the conductor's prompt store**, resolving a prompt as
  database override, then `byProfile` for the active profile, then `value`.
  Applied in `hydrate()`, `getPrompt()` and `resetPrompt()` so all three paths
  agree.

Nothing populates `byProfile`, and the test asserts that nothing does.

## Why

**Prompt text is not where models differ.** What genuinely varies between
Qwen3.5 and a Llama 3 finetune is already captured in `LLM_PROFILES`: stop
tokens, whether a system turn may appear mid-conversation, the context window,
the sampling numbers. Those are mechanics. A prompt is about the character and
the task, and forking one per model means every later edit has to be made twice
and will not be. So the default is one set, and a fork has to be earned by
evidence of a specific failure — hence the escape hatch ships empty and the test
keeps it that way.

**The old test only checked variable parity in one direction.** It asserted that
every `{{var}}` appears in `variables`. The reverse — a name declared in
`variables` that the template never writes — was unchecked, and it is the more
dangerous direction: `render()` leaves an undeclared placeholder visible, but a
declared-and-unused variable is simply dropped with no trace. Both directions are
checked now.

**The budget check had to cover every profile, not the active one.** `PROFILE`
in the conductor resolves once from the environment, so a prompt that fits
`qwen35` and overruns `llama3` fails only on the machine that switched profiles,
at runtime, silently — `trimToBudget()` drops optional sections without raising
anything.

## Evidence

Run against the **current, unmodified** prompts. 215 pass, 0 fail.

Clean across all 42: vendor chat tokens, reasoning scaffolding, variable parity
both directions, rendering without leftovers.

```
qwen35  promptMax 40000  historyMax 24000  room 16000  used 5842   36%
llama3  promptMax 10000  historyMax  6000  room  4000  used 5842  146%
```

The 5842 is the worst-case chat system turn with every optional block present
and every variable rendered empty — before a single character of the card, the
chronicle or the transcript is added.

`room` is `promptMaxChars - historyMaxChars`: what the scaffolding may occupy
before it starts eating the conversation. Qwen3.5 is the target and passes it
with 64% to spare. Llama 3 is over that line, which is recorded rather than
enforced: it is a portability target, not the machine this runs on, and the
overhaul is expected to close the gap on its own. Its hard ceiling of 10000 is
enforced, because crossing that truncates the prompt rather than degrading it.

Two prompts are 71% of the total:

```
2507  persona.system          24 rule-lines in one block
1624  persona.webAnswerOnly   four worked examples
 579  mind.outputDirective
 364  persona.user
 352  persona.influence
 333  the six small persona blocks combined
```

Per-category character counts before the overhaul, as the baseline to measure
against: persona 7388, authoring 6664, media 5959, writing 2707, memory 2164 —
24882 total.

## Follow-ups

- The overhaul is expected to bring `llama3` under 4000 without being aimed at
  it. If it does, tighten its assertion to the strict rule. The budget numbers
  are not to be edited to match the prompts.
- `tests/registry.test.ts` fails on `main` independently of this change:
  `CHARACTER_TASTE_COPY`, `PERSONA_COPY` and `QUEUE_COPY` are exported from
  `@eidolon/config` and unclassified in the registry. Untouched here.
