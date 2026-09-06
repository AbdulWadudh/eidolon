# Per-character settings, ownership, and a chat that follows the character

**Date:** 2026-09-06
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

The three-dot button in a chat now opens that character's card: name, tagline,
personality, system prompt, scenario, rules, example dialogue, greeting and
voice, all editable in place, with a paint icon through to the theme studio and
a switch that publishes the character publicly.

Saving does one of two things, decided by who wrote the character:

- **Yours, or nobody's yet** — edited in place. An unowned character (the
  presets, anything created before this change) is adopted by whoever edits it
  first, so the roster does not fill with near-identical copies of your own work.
- **Somebody else's** — forked. A new character is written under your account
  with `forked_from` pointing at the original, and the chat follows the fork.
  The original is not touched, and you cannot publish it.

better-auth is properly installed behind this. Its four tables (`user`,
`session`, `account`, `verification`) are created by
`apps/conductor/scripts/auth-migrate.ts` and its routes are mounted under
`/api/auth`. The conductor is paired with a device rather than signed into, so
the first boot provisions one local account and the pairing secret acts as it —
the single user keeps working exactly as before, while characters gain a real
owner. A second person signing up gets their own account and their own roster.

Separately: **opening a different character no longer shows the last one's
conversation.** `loadHistory` kept the longer of the two transcripts, which was
right for a reply landing mid-fetch and wrong for every character switch.

## Why

The migration is a script rather than `better-auth migrate` because the official
CLI loads the config through jiti, which cannot resolve `bun:sqlite`, and dies
before it reads the database. Running `getMigrations(authOptions)` from Bun uses
the same options object the server uses, so the two cannot drift.

Adoption rather than fork-on-every-edit was chosen deliberately. Fork-always is
simpler to implement and produces a roster of "Ines Vaz", "Ines Vaz 2",
"Ines Vaz 3" for a user who only ever wanted to change her greeting.

## Evidence

Live, against the running conductor with the paired device's token:

```
owner resolved            : AYn6sCfpqjeuOKrrgSKpVAf4UWZzzpTx
PATCH an unowned character: forked=false, ownerId now set, id unchanged
PATCH someone else's      : forked=true, id someone-elses-girl-2,
                            forkedFrom=someone-elses-girl, owner=AYn6sCfp...
  the original afterwards : rules="Original rules", owner=someone-else
POST .../publish on theirs: 403
```

Boot no longer prints the missing-table error; `bun scripts/auth-migrate.ts`
reported `[auth] added: user, session, account, verification`.

Suites: conductor 347 pass, canvas 130 pass (6 of them new, in
`apps/canvas/tests/chat-switching.test.ts`, covering the switch, the shorter
history, affinity, the half-typed draft, and the two same-character cases that
must *not* reset). Lint, typecheck and `check:size` green — `chat/[id].tsx` had
reached 304 lines and the sheets were extracted to `ChatSheets.tsx`.

## Follow-ups

- None of this is device-verified. The APK at `8a6b993` predates the roster, the
  create screen, the voice picker, the settings sheet and the switching fix.
- The roster's ⋯ button still just opens the chat.
- `greeting` is stored and reaches nothing — no code opens an empty chat with it.
