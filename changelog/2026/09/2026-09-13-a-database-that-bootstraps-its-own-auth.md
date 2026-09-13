# A database that bootstraps its own auth, and accounts that have a role

**Date:** 2026-09-13
**Scope:** apps/conductor, packages/config

## What changed

- `auth/schema.ts` runs better-auth's own migration planner at boot.
  `ensureAuthSchema()` is awaited at the top of `auth/index.ts` before `auth` is
  constructed, memoised so it runs once per process.
- `user` gains a `role` column, `owner` or `member`, through better-auth's
  `additionalFields`. `USER_ROLES`, `isUserRole` and `roleOrDefault` land in
  config alongside `AUTH.ownerRole` / `AUTH.memberRole` / `AUTH.defaultRole`.
- `databaseHooks.user.create.before` stamps the role on the way in: the first
  account on a conductor becomes `owner`, every one after it a `member`.
- `auth/roles.ts` carries the account reads and writes — `listAccounts`,
  `getAccount`, `setUserRole`, `renameAccount`, `deleteAccount`, `countOwners`.
- `auth/guard.ts` carries `requireOwner`, a Hono middleware answering 401 with
  no credential and 403 for a `member`.
- `Owner` gains `role`. `ensureLocalOwner` claims `owner` for the account behind
  `PAIRING_SECRET` whether it provisioned that account or found it.
- `GET /api/v1/session` reports the account behind a credential, or `null`.

## Why

**There was no better-auth migration in the repo.** `scripts/auth-migrate.ts`
existed and did the right thing, but nothing ran it — not boot, not a package
script. A brand-new database therefore came up without `user`, `session`,
`account` or `verification`, and everything touching an account died on
`SQLiteError: no such table: user`. Measured on an empty `EIDOLON_DATA_DIR`:
**7 of 15 tests** in `auth.test.ts` and `characters-ownership.test.ts` failed,
all of them on that one error.

The fix reuses `getMigrations` from `better-auth/db/migration` — the same call
the hand-run script already made — rather than hand-writing `CREATE TABLE` for
four tables whose shape better-auth owns. Hand-written DDL would have to be
chased every time an `additionalFields` entry is added; this derives from
`authOptions`, so `role` arrived without a second edit. No new dependency: that
subpath is already an export of the installed better-auth 1.7.3.

It is memoised and gated on a non-empty plan rather than run unconditionally,
because every test file that imports `@/auth` pays for it. Measured: **23 ms**
on an empty database, **3 ms** when the schema already matches.

`input: false` on the `role` field is load-bearing. With better-auth's default
of `input: true`, the signup body is merged into the user row, and anyone could
hand themselves `role: "owner"` while creating their account.

The role is stamped in a `before` hook rather than after signup because signup
is served by `auth.handler` mounted straight onto Hono — there is no route of
ours in between to patch the row from.

`ensureLocalOwner` claims `owner` unconditionally, not only when it creates the
account. `PAIRING_SECRET` is held by whoever runs the conductor, and already
granted full character CRUD through this account. Without the unconditional
claim, a human signing up before the first QR pairing would take `owner` and
silently strip the paired handset of the admin screens.

## Evidence

`bun run lint` clean over 405 files. `bun run typecheck` green across five
packages.

On an empty `EIDOLON_DATA_DIR`, `auth.test.ts` and `characters-ownership.test.ts`
go from **8 pass / 7 fail** to **15 pass / 0 fail**.

`apps/conductor`: **559 tests, 558 pass, 1 fail** — nine of those tests are new,
in `tests/roles.test.ts`. `apps/canvas`: **227 pass, 0 fail**.

The one failure is `POST /characters/import`, which needs object storage that is
offline here. It fails identically on a clean tree and is not from this change.

`tests/roles.test.ts` proves the fresh-database claim rather than asserting it:
it spawns a second conductor against a `mkdtemp` directory, signs two accounts up
over HTTP, and reads back `first@fresh.local → owner`, `second@fresh.local →
member`. It also proves the no-QR path — a session token returned by
`sign-in/email` passes `validateToken`, `GET /pair/verify` and the WebSocket
gate, so a device that never saw a QR code can reach the conductor by URL alone.

## Follow-ups

- `/api/v1/prompts` is still unauthenticated. It predates this work and nothing
  calls it — zero references in canvas — so it was left exactly as it was.
- `scripts/auth-migrate.ts` is now redundant with boot. Kept for the moment as a
  way to inspect a pending plan without starting the server.
- Nothing revokes a session when an account is deleted by some path other than
  `deleteAccount`.
