# An admin API, and the screens that drive it

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config, packages/protocol

## What changed

- A versioned admin prefix, `ADMIN_API_PREFIX` = `/api/v1/admin`, with
  `adminApiPath` / `adminApiUrl` helpers in config. Four surfaces under it:
  `prompts`, `characters`, `users`, `theme`.
- `api/admin/index.ts` applies `requireOwner` once with `admin.use("*", …)`, so
  a surface cannot be added without the gate.
- `packages/protocol/src/admin.ts` carries the request and response schemas.
  Routes validate bodies with `safeParse` and answer 400 rather than coercing.
- `config_overrides (path, value, updated_at)` lands in the schema. The theme is
  its first tenant: tokens live at `theme.<token>`, merged over the shipped
  palette by `services/theme.ts`.
- Canvas gains `store/auth-store.ts`, `store/admin-api.ts`, a `(main)/admin/`
  route group behind a role gate, and a `SignInPanel` on the pairing screen.
- The home screen grows a dashboard card, rendered only for an `owner`.

## Why

**The gate is applied to the router, not to the handlers.** Per-route guards are
the kind of thing that stays correct until somebody adds the twelfth route and
forgets. `admin.use("*", requireOwner)` makes forgetting impossible, and the test
walks all four surfaces rather than trusting one.

A `member` gets **403, never 404 and never a 200 over empty data**. 404 would
leak nothing but also teach a client to retry; an empty 200 is worse, because the
screen renders "nothing here" and the user believes it. The test asserts the body
is exactly `{ error }` with no data keys alongside it.

**Theme rides `config_overrides` rather than a table of its own.** A theme *is*
configuration, and the overlay already had to exist for section 3. A third table
would have meant a second merge path to keep honest.

The theme resolver merges over `DEFAULT_THEME_TOKENS` (or the light palette when
`mode` is overridden) rather than storing a whole palette. Storing the full set
would freeze the shipped defaults at the moment somebody first touched a colour;
storing only the delta means a token nobody changed keeps tracking the package.

`/api/v1/prompts` was **left exactly as it was**. Canvas has zero references to
it, so moving it would have broken nothing — but it is an existing route, and
that is not a call to make unasked.

**The sign-in path is additive.** `signInEmail` returns a session token, and
`validateToken` already accepted session tokens, so signing in feeds the existing
`setManualConnection(host, token)` untouched. QR pairing, the manual
host-and-passphrase form, and the socket gate are all unchanged.

**The role gate holds a blank canvas-coloured view rather than animating.**
`isResolved` starts false, so there is no frame where a `member` sees the
dashboard before being redirected. This was the one place a transition would
have actively hurt: anything with a duration is a window during which the wrong
content is on screen.

Entry stagger is **clamped at `UI_MS.revealStaggerCap`**. The prompt list is 30+
rows and the config list will be longer; an uncapped 55 ms stagger would take
most of two seconds to finish drawing, and the last row would animate long after
the user started reading the first.

## Evidence

`bun run lint` clean over 426 files. `bun run typecheck` green across five
packages.

`apps/conductor`: **577 tests, 576 pass, 1 fail** — 17 new in
`tests/admin-api.test.ts`. `apps/canvas`: **234 pass, 0 fail** — 7 new in
`tests/admin-access.test.ts`.

The one failure is the pre-existing `POST /characters/import`, which needs object
storage that is offline here.

After the suite, the database was queried directly: no fixture characters, no
`@eidolon.test` accounts, and no leftover `config_overrides` rows. The roster
holds only `owner@eidolon.local`.

The theme test asserts the served token set is exactly `Object.keys(
DEFAULT_THEME_TOKENS)`, so the hand-written Zod schema in protocol cannot drift
from the package without a red test.

**On-device behaviour is unverified.** No handset was attached. The screens are
typechecked and linted; the press feedback, the stagger and the disclosure have
not been felt on real hardware, and the skill that produced them is explicit that
motion cannot be judged from code.

## Follow-ups

- The dashboard has no audit trail. Any of these mutations is invisible after the
  fact.
- `PATCH /admin/users/:id` revokes nothing. Demoting an owner leaves their live
  session valid until it expires; only `deleteAccount` clears sessions.
- The character editor exposes five fields of the card. Voice, pronouns and the
  system prompt are readable through the API but have no control yet.
- The theme screen edits one palette. Per-character overrides and the
  dark/light split still live only in the canvas MMKV store.
