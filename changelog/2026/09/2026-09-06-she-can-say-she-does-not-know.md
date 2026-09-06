# She can say she does not know, and she stops reciting her own instructions

**Date:** 2026-09-06
**Scope:** apps/conductor, packages/config, stack

## What changed

Three faults, found from one screenshot of a chat where the character was asked
who won the IPL.

**She said an instruction out loud.** The reply was, word for word,
`persona.mustSpeak`: *"That was only a stage direction. Say something out loud
this time..."* That is a system turn the conductor sends when a reply came back
as nothing but an action. The model answered it instead of obeying it, and the
reader saw the machinery. `leaksInstruction` now compares a reply against the
opening words of every reminder the conductor sends, and both paths that can
produce one — the main turn and the `sayItOutLoud` continuation — replace a match
with a spoken fallback.

**A search that finds something is not a search that found the answer.** Asked
who won the "Zorbulon Nebula Cup", DuckDuckGo returned a page about the Nebula
Awards for science fiction. The old code checked only whether results were empty,
so it handed those over as fact and the model invented a winner, an opponent, a
2-2 draw and a penalty shootout. `answersQuery` now requires every distinctive
word in the question to actually appear in the results, and when they do not the
prompt says so and asks her to admit it.

**She answered like an encyclopedia.** Even with the right facts the reply read
*"The 2026 Indian Premier League (IPL) champions are the Royal Challengers
Bengaluru (RCB), who defeated the Gujarat Titans (GT)..."* — nothing like a text
message.

Alongside that, embeddings are on, which turns semantic recall from a stub into
something that works.

## Why

**Telling the model how to speak inside a long system prompt does not survive
being handed encyclopedia prose.** The facts arrive in a formal register and the
model answers in whatever register it was just given. Four attempts at rewording
the instruction where it sat all failed. Moving the same words to a system turn
placed directly *before the user's message* fixed it on the first try, and held
across three runs:

```
before: The 2026 Indian Premier League (IPL) champions are the Royal Challengers
        Bengaluru (RCB), who defeated the Gujarat Titans in the final...
after:  *checks the latest IPL updates* RCB took it this year. They beat Gujarat
        in the final.
```

Recency is the only lever a small model reliably feels. That is the same lesson
the `[mind_update:]` work landed on, and it is worth writing down.

**One later "improvement" made it worse.** Adding *"never copy a line word for
word"* to that prompt pushed the IPL answer straight back to encyclopedia form.
It was reverted. Prompt tuning on an 8B model is not monotonic; each change needs
measuring rather than reasoning about.

**The relevance gate is lexical on purpose.** Asking the model whether its facts
answer the question is asking the component that is already hallucinating. A word
of seven letters or more that never appears in the results is a deterministic
signal that they are about something else. Generic nouns are exempt, because a
forecast reports "18C, light rain" and never says the word "weather" — that
exemption exists because a test caught the false positive before it shipped.

## Embeddings, and a wrong turn worth recording

`--embeddings --pooling mean` is now on `stack/start-llm.bat`, and
`/v1/embeddings` serves 4096-wide vectors.

**I reported a 10x slowdown that was not real.** Generation measured 12.5 tok/s
after the restart against a documented 120, so the flag looked expensive and I
reverted it. It was still 12.5 tok/s reverted. The cause was VRAM: the model
wants ~9.7 GB, ComfyUI was holding 8.2 GB of a 16 GB card, and llama.cpp silently
puts the overflow on CPU rather than failing. Freeing ComfyUI restored 102-130
tok/s, and with the card healthy the embedding flags cost nothing — 124-130
tok/s with them on. Both the flag and the real cause are now written on the
script.

Two things had to change before recall could ever fire:

- **The score was the reciprocal of an L2 distance.** On normalised vectors that
  tops out near 0.59, and the gate was 0.65, so nothing could pass whatever the
  embedder returned. It is cosine similarity now, which is what the threshold was
  always written against.
- **The table's vector width is fixed at creation** and was 384 while the
  endpoint returns 4096. The width is discovered on the first call, recorded
  beside the data, and the table is rebuilt when it changes.

**Recall returns one memory, not two.** Measured on this embedder, a true match
scored 0.531 and an unrelated one 0.510 on the same query: two hundredths apart.
The runner-up is noise rather than a second memory, and a wrong memory in the
prompt is worse than no memory. `stack/start-embed.bat` runs a purpose-built
embedder on 8081, which earns the second slot and the 0.65 threshold back.

A corrupt table used to be permanent. Reads now reopen once, and rebuild empty as
a last resort, because a table that can never be read means recall never works
again on that install.

## Evidence

- `bun run lint`, `bun run typecheck`, `bun run check:size` — all pass.
- Tests: conductor 306, canvas 124, config 38, protocol 25 — all pass.
- 16 new tests on the relevance gate and the instruction guard.

Live, through the socket:

```
who won the ipl this year?          -> RCB took it this year. They beat Gujarat in the final.
who won the 2026 Zorbulon Cup?      -> No idea, honestly. I have not been keeping
                                       up. Who won that one?
what is the weather in Tokyo now?   -> answered from live results
```

Recall, against the live endpoint: "what was your mum's name again" retrieves the
mother memory at 0.531 and injects it; the job, injury and dinner queries all
score below 0.50 and inject nothing.

## Follow-ups

- The weather answer still reads as a forecast dump — *"Winds NE at 10 to 15
  mph"*. The IPL case is fixed and the weather case is only improved.
- `*checks the latest IPL updates*` contradicts the instruction never to mention
  looking something up. It reads naturally, so it was left.
- The relevance gate is a word check. A question whose distinctive term appears
  in unrelated results still gets through.
- `packages/config/src/prompts.ts` reached the 300-line limit and is now four
  files by subject: persona, writing, media, memory.
