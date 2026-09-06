# A graph of the repo, and a rule to ask it first

**Date:** 2026-09-07
**Scope:** RULES.md, graphify-out/

## What changed

`graphify-out/` now holds a knowledge graph of this repository, and RULES.md §20
says to query it before going looking for something.

The graph has **2,768 nodes and 6,226 edges across 205 communities**, built from
379 files (~188k words): 328 code files extracted structurally by AST, 46 docs
and 5 images extracted semantically. It is committed rather than ignored, so a
fresh clone can follow the rule it is subject to.

§20 draws the line where the graph is actually better than grep: *where does this
live*, *what talks to what*, *why is it built this way*. It exempts opening a
file you already know the path of, requires `/graphify . --update` after a change
set that adds or moves files, and says the source wins when the two disagree.

## Why

The graph crosses boundaries grep cannot. A changelog note explaining a guard and
the guard itself end up one hop apart, because the note names the mechanism and
the extractor links them — no shared string, so no grep would ever pair them.
That is the case the rule is for, and it is also why the graph has to be
committed: a rule telling everyone to query something a fresh clone does not have
is unenforceable.

It is committed rather than ignored despite being generated output, which cuts
against §6. The cost is 6.7 MB in the tree and a diff on rebuild; the alternative
is a rule nobody can follow until they spend twenty minutes and 621k tokens
rebuilding it themselves.

The staleness clause exists because the failure mode is silent. A graph that is
three change sets old answers confidently and wrongly, and nothing about the
answer says so — hence the changelog note when it is rebuilt, so the next reader
can see how current the thing they are trusting is.

## Evidence

Proof query, run against the built graph:

```
graphify query "how does the chat turn reach the LLM?"
Graph: graphify-out/graph.json (2768 nodes) | BFS depth=2 | 635 nodes found

handleChatTurn()      apps/conductor/src/ws/chat-turn.ts L22
assemblePrompt()      apps/conductor/src/orchestrator/prompt-builder.ts L152
streamChatCompletion() apps/conductor/src/services/llm.ts L50
streamReply()         apps/conductor/src/ws/reply-stream.ts L155
appendMessage()       apps/conductor/src/db/index.ts L139
```

Real files, real line numbers, and the path from the socket handler through
prompt assembly to the model and back into the database.

Artifact sizes, all under the 5 MB per-file threshold and 6.7 MB in total, so
nothing was excluded:

```
graph.json       3.41 MB     GRAPH_REPORT.md   0.04 MB
graph.html       2.63 MB     .graphify_labels  0.01 MB
manifest.json    0.08 MB     cost.json         0.00 MB
cache/           0.53 MB (71 files)
```

`grep -c '^## [0-9]' RULES.md` returns 20. Extraction cost 621,081 tokens across
7 parallel agents.

## Follow-ups

- **The health check reports 531 dangling-endpoint edges.** Those are semantic
  edges whose endpoints the subagents named but never declared as nodes — the
  graph is usable and the count is visible rather than swallowed, but it is real
  loss and worth a pass with `--mode deep` to see whether it closes.
- 506 edges collapsed on the same endpoint pair. Mostly benign: `imports_from`
  and `re_exports` between the same two files become one undirected edge.
- 205 communities is more than the corpus has distinct ideas. The 22 largest are
  named by hand; the tail is derived from each community's dominant path, which
  is honest but not insightful.
- `graphify-out/` is generated output living in the tree, which sits awkwardly
  beside §6. If the diff noise on rebuild becomes annoying, the alternative is a
  build step in CI plus an artifact download.
