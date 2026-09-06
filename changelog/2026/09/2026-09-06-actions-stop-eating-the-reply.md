# Actions stop eating the reply

**Date:** 2026-09-06
**Scope:** apps/conductor, packages/config

## What changed

A stage direction is now capped in one place and enforced everywhere, rather
than being asked for politely in a prompt and hoped for.

`apps/conductor/src/services/stage-directions.ts` holds the rule:
`STAGE_DIRECTIONS.maxWords` (5) and `STAGE_DIRECTIONS.maxPerReply` (1). It
exposes a streaming gate and the same rule for finished text.

- **The character's reply.** `createActionGate()` sits after the persona filter
  in `streamOnce`. Everything between asterisks is buffered until the closing
  asterisk arrives; only then is it emitted, and only if it is still short and
  the first of the turn. A paragraph of prose in asterisks is dropped as it
  arrives, so the reader never watches narration start. If nothing is left to
  say out loud — a bare `*smiles*`, or a whole reply the gate threw away — the
  existing `sayItOutLoud` continuation runs and the turn ends on words.
- **Reply options.** `shapeSuggestion` strips markdown bold, runs the same
  limit, and returns `""` for an option with nothing spoken in it, so it never
  reaches the tray. `capActions` then allows at most `SUGGESTIONS.maxWithAction`
  (1) of the three options to carry an action; the rest keep what the player
  says and lose the asterisks. The fallback pool is now two lists — seven with
  an action, seven without — mixed to the same ratio.
- **Spontaneous messages.** `shapeOpener` in the proactive worker runs the same
  limit.
- **Prompts.** `persona.system`, `suggestions.system`, `suggestions.user` and
  `proactive.system` now say an action is optional and usually absent, name the
  five-word ceiling, forbid a description inside the asterisks ("no heart
  skipping, no breath on skin"), and forbid a reply that is only an action.
  `suggestions.system` takes the ceiling as `{{maxActionWords}}` rather than
  repeating the number in prose.

## Why

The reply tray was three stage directions and almost nothing said. Two of the
three options in the reported screenshot were entirely inside asterisks — "*My
heart skips a beat as you lean in closer, your warm breath tickling my skin…*" —
and the third opened with a twenty-word action, carried five spoken words, and
opened a second action. Every one of them hit the 140-character clip, so the
reader was offered three truncated paragraphs of narration and nothing to send.

The prompt already asked for "at most one action, two to five words". A 12B
local model at temperature 0.9 does not honour that on its own, and nothing in
the pipeline checked. The shaping code counted sentences and characters but had
no opinion about asterisks, so a paragraph of narration passed as an option.

Buffering rather than filtering afterwards matters for the streamed reply: the
tokens are gone once they are emitted, and the client ignores `text_replace`
(only `text_delta` is handled in `apps/canvas/store/chat-events.ts`), so an
after-the-fact correction would not have reached the screen. Holding asterisks
back costs latency only inside an action, which is at most five words by
definition.

## Evidence

- `bun test` in `apps/conductor`: 243 pass, 0 fail across 22 files, including a
  new `tests/stage-directions.test.ts` (gate opens and closes across chunk
  boundaries, drops prose, drops a second action, keeps a short unterminated
  one) and seven new cases in `tests/suggestions.test.ts` built from the exact
  strings in the screenshot.
- `bunx tsc --noEmit` in `apps/conductor`: clean.
- `bunx biome check` over `apps/conductor` and `packages/config`: no findings in
  the changed files.

## Follow-ups

- The client drops `text_replace` on the floor. `reply-stream.ts` uses it to
  swap out a repeated line and the proactive worker uses it to deliver an
  unprompted message, and neither lands. Unrelated to this change set, found
  while tracing it.
- A prompt already saved in the `prompts` table overrides the default, so an
  instance that has customised `persona.system` or `suggestions.system` keeps
  the old wording. The code limits hold either way.
