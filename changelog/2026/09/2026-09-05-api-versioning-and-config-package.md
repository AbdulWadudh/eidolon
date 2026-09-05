# API versioning, a config package, and no more comments

**Date:** 2026-09-05
**Scope:** packages/config, apps/conductor, apps/canvas, RULES.md, AGENTS.md

## What changed

### Every route is versioned

The HTTP and WebSocket surface moved under `/api/v1/`. `apps/conductor/src/api/v1.ts`
holds the router; `src/index.ts` mounts it at the prefix and does nothing else
route-shaped.

| before | after |
|---|---|
| `GET /health` | `GET /api/v1/health` (also kept at `/health`) |
| `GET /api/pairing` | `GET /api/v1/pairing` |
| `GET /api/pair/verify` | `GET /api/v1/pair/verify` |
| `GET /api/pairing/qr` | `GET /api/v1/pairing/qr` |
| `GET /ws` | `GET /api/v1/ws` |

Clean break — the old paths 404. The mobile client, the pairing payload and the
docs moved in the same change, so nothing in the tree points at a dead path. An
APK already on a handset needs a rebuild.

### `@eidolon/config`

New workspace package, the single source for anything configurable: ports,
hosts, URLs, route paths, timeouts, the reconnect schedule, embedding width,
search limits, cache TTLs, storage prefixes and content types, data filenames.

Two entry points, and the split is load-bearing:

- `@eidolon/config` — isomorphic, imports nothing from Node, safe in React
  Native. Route tables and URL builders live here so both sides of the wire read
  the same declarations.
- `@eidolon/config/server` — reads `process.env` and the filesystem. The mobile
  app must never import it.

`getPersistentDataDir`, `SQLITE_DB_PATH` and `LANCEDB_DIR_PATH` moved here from
`apps/conductor/src/utils/paths.ts`, which is gone. Storage, LLM, ComfyUI,
SearXNG, auth origins and the pairing secret are all resolved here now;
`process.env` no longer appears anywhere in `apps/conductor/src`.

### `PAIRING_SECRET` has no default

`eidolon_dev_secret_key_change_in_prod` was a committed placeholder standing in
for a credential. It is deleted. `getPairingSecret()` reads the environment and
returns empty if unset, and `validateToken` refuses **every** token when the
secret is blank — checked live, not captured at import, so an empty secret can
never become a wildcard that matches an empty token. The conductor says so on
boot.

### No comments

RULES.md §16. Roughly 380 lines of comments I had added across the previous
change sets were removed; comments that predate this work were left alone.

## Why

An installed app is not a page that reloads with the server. A handset can be
running a build from months ago against a conductor deployed this morning, and
without a version in the path the only options are "never change a response
shape" or "break old clients silently". `apiPath`/`apiUrl`/`socketUrl` exist so
that neither side can drift by spelling a route out by hand.

The config package is the same argument applied to values instead of routes. A
literal buried in a call site is a decision nobody can find again, and the same
constant written in two places is a bug waiting for one of them to change.

## Evidence

- `bun run test` — 80 pass, 0 fail (15 protocol, 18 config, 47 conductor).
- `bun run typecheck` — clean across all six packages.
- Audited: no `process.env` outside `packages/config`, no route string literals,
  and `apps/canvas` does not import `@eidolon/config/server`.
- New tests cover the version prefix, the URL builders, storage/service/path
  resolution, and that an unset or blank `PAIRING_SECRET` refuses everything.

## Follow-ups

- `apps/canvas/services/font-registry.ts` still pins six `raw.githubusercontent.com`
  font URLs and `google-fonts.ts` pins the Webfonts API. Those are functional
  asset data rather than deployment config, and were explicitly left out of the
  earlier de-hardcoding pass — worth a decision, not a silent move.
- `bun run lint` still reports 17 formatter errors, all pre-existing, all in
  `apps/canvas` `.tsx` files.

---

# Pairing screen redesign

## What changed

`apps/conductor/src/pairing/page.ts` (split out of `qr.ts`) replaces the flat
card with a designed surface: the Eidolon mark and wordmark, a serif display
heading, amber scanner brackets framing the code, a live status pill, copy
buttons on the Server and Token values, and a "Camera not working?" disclosure
covering the manual path.

The status pill is backed by real state. `src/ws/index.ts` now counts open
sockets and `GET /api/v1/pairing/status` reports it, so the page flips from
"Waiting for a device to scan" to "1 device paired" the moment the phone
connects — the screen answers the question you actually have while looking at it.

Brand assets are served at `/assets/logo.svg` from `public/`, which the image
now carries.

## Motion

Gated with `/find-animation-opportunities`, built and then corrected against
`/animate`. This is a rare, first-run surface, which is the one place the
delight budget is allowed to be spent.

Kept: staggered entrance (400ms, 55ms stagger, `transform`/`opacity`,
`cubic-bezier(0.23, 1, 0.32, 1)`), a halo pulse on the waiting dot,
`scale(0.96)` press feedback at 160ms with a checkmark swap, and a 220ms
disclosure.

Rejected: drawing the QR modules in (functional data a camera is reading),
an animated background (decoration that burns CPU on a page left open), and a
hover lift on the card (no purpose — the card is not interactive).

Three defects `/animate` caught in the first pass, all now fixed:

- `prefers-reduced-motion` shortened the reveal to 1ms. Reduced motion means
  *gentler*, not absent — it now keeps the opacity fade and drops the movement.
- `:hover` was ungated, so a tap fires a false hover on touch. Both hover rules
  are behind `@media (hover: hover) and (pointer: fine)`.
- The entrance ran 880ms to the last element. Now 730ms.

## Rules

RULES.md §17 and §18, and the matching AGENTS.md entries: nothing ships looking
plain, and motion is gated by purpose and frequency before it is built. Both
name the skills to run — `/ui-ux-pro-max`, `/find-animation-opportunities`,
`/animate`, `/animate-expo` — so this is repeatable rather than a one-off.

§18 carries the Expo standard too: Reanimated on the UI thread, springs for
anything a finger touched, no `setState` in a gesture handler, no core
`Animated` or `PanResponder`, and feel judged on a release build rather than in
Expo Go.

## Not verified

The Expo half of §18 is written but not yet applied — `apps/canvas` still has
essentially no motion. The rule is the standard for when it is built.
