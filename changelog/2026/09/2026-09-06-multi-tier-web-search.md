# Web search stops depending on one host

**Date:** 2026-09-06
**Scope:** apps/conductor, packages/config

## What changed

- `apps/conductor/src/services/search.ts` replaces `services/searxng.ts`.
  `searchWeb(query)` now returns a formatted string rather than an array, and
  walks a ladder, returning the first tier that yields results:
  1. `duck-duck-scrape` — queries DuckDuckGo directly, no key, no signup.
  2. `serper.dev` — used only when `SERPER_API_KEY` is set.
  3. `exa.ai` — used only when `EXA_API_KEY` is set.
- Every tier logs a warning and falls through on a throw *or* on an empty
  result. When all three are exhausted or unconfigured the function returns
  `""`, so a search outage never interrupts a chat turn.
- An in-memory `Map` caches the formatted string for an hour, keyed on the
  trimmed, lowercased query. Only non-empty results are cached.
- `formatSearchResults` strips HTML tags and entities and collapses whitespace
  before emitting the `[Real-Time Web Reference Information]:` block.
- `GET /health` reports `webSearch: { primary, hasSerperFallback, hasExaFallback }`.
- `services/searxng.ts`, its test, `SEARXNG_URL` and the `searxngUrl` field on
  `ServicesConfig` are gone, along with the compose passthrough.

## Why

The conductor had exactly one search backend, a SearXNG instance, and that
instance is the part most likely to be down, rate-limited, or refusing every
engine at once — the old client already had a warning for "every engine
refused", which is the tell. A single unreliable dependency for a feature that
is supposed to degrade quietly was the wrong shape.

DuckDuckGo is primary because it needs no account: a fresh clone searches the
web with no setup at all, which SearXNG never allowed. The two keyed providers
are strictly optional, so an operator who wants reliability can buy it and
everyone else still gets a working default.

SearXNG was removed rather than kept as a fourth tier because leaving it wired
would have meant maintaining a code path nobody exercises; the ladder above
covers the same need without a host to run.

## Evidence

- Live run: DuckDuckGo returned `DDG detected an anomaly in the request` (its
  throttle), Serper answered with three correct results in 1768ms, and the
  repeated query returned byte-identical text in 0ms from cache. The ladder and
  the cache were both exercised against the real network, not a mock.
- `apps/conductor/tests/search.test.ts` covers the cache hit with zero network
  calls, HTML-free formatting, all-providers-offline returning `""`, the
  DDG→Serper and DDG→Serper→Exa fallbacks, and a blank-query short circuit. It
  mocks `duck-duck-scrape` and clears the API keys per test, so it never touches
  the network.
- `bun run lint`, `bun run typecheck` and `bun run test` all pass.

## Rejected

- Keeping SearXNG as a fourth tier. It reintroduces the host dependency the
  change exists to remove.
- Failing loudly when no provider is configured. Search is an enrichment; a chat
  turn that dies because a search key is missing is worse than one without
  fresh facts.
