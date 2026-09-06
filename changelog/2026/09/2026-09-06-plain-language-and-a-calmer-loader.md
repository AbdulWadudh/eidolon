# The app stops talking like a server

**Date:** 2026-09-06
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

### One vocabulary, in config

`packages/config/src/copy.ts` holds every user-visible string both apps share —
`STATUS_COPY`, `CONNECTION_COPY`, `PHOTO_COPY`, `PAIRING_COPY`, `HOME_COPY`,
`THEME_COPY`. The conductor imports the same table it sends details from, so
server and client cannot drift.

Representative changes:

- `painting` → **Capturing the moment**; `searching` → **Checking what's
  happening out there**; `thinking` → **Thinking it over**.
- `Conductor Node` → **Connected to**; `Available Personas` → **Who's here**;
  `Stage 1 Persona • Conductor Synced` → **Ready when you are**; `Enter Stage` →
  **Say hello**; `Unpair` → **Disconnect**.
- `Link to Conductor` → **Connect to your Eidolon**; `Server Host & Port` →
  **Address**; `Pairing Secret Token` → **Passphrase**.
- `Live CSS Variable Inspector` → **What's set right now**; `Corner Radius
  (--radius)` → **Corners**; `Primary Accent (Button)` → **Accent**;
  `Inheriting Global Master` → **Same as everyone**.

### The two status tables became one

`chat/[id].tsx` and `ChatFeed.tsx` each carried their own map from status to
label, and they disagreed — the top bar said "Painting" while the feed said
"Painting a scene". Both now read `STATUS_COPY`.

### Pairing errors say what to do

`parsePairingUri` and `setManualConnection` throw the copy the user should read
rather than `Invalid pairing URI protocol`. `humanPairingError` only passes a
caught message through when it is one of ours, so a raw `Network request failed`
can no longer reach the screen.

### No assumed gender

The copy addressed the character as "her" throughout — `Finding her voice`,
`<nudge her>`, `Use as her face`, `Where she is`. Characters are arbitrary, so
the wording was changed to need no pronoun at all rather than swapped for a
neutral one: **Saying it out loud**, **`<nudge>`**, **Use as the face**, **The
whole scene**.

`packages/config/src/image.ts` and `services/photo-look.ts` still hardcode
"her" — that is image-generation vocabulary, not interface copy, and changing it
changes what gets rendered. Left alone deliberately.

### The photo loader stopped showing its working

`PaintingCard` no longer renders the denoising latent preview. It is a
placeholder at the image's aspect ratio with a slow sheen sweeping across it, a
thin progress bar, and the status line. `image-turn.ts` no longer subscribes to
`onPreview`, so the conductor stops base64-encoding a JPEG per preview tick and
pushing it over the socket; only the numeric progress is sent. The
`paintingPreview` store field, its prop chain and its reset sites are gone.

### Three animations

- `ChatTopBar` crossfades the status label on change (220ms) and transitions the
  dot colour, so the line that changes most often stops teleporting.
- The home cards enter staggered (400ms, 55ms apart).
- The pairing error banner enters with `FadeInDown` rather than appearing.

All three read `UI_MS` / `EASING_BEZIER` and honour `useReducedMotion`.

### Keyboard regression

`cf96f4c` needed the chat backdrop to sit behind the input dock, and to get it
there it wrapped everything below the top bar in a new `<View className="flex-1">`
— which pushed the `KeyboardAvoidingView` one level deeper. The dock stopped
lifting the full keyboard height and the action-button row landed underneath the
keyboard.

`ChatBackdrop` is already `position: absolute` on all four edges, so it never
needed a wrapper to fill anything. It now sits *inside* the
`KeyboardAvoidingView` as an absolute first child, which keeps it behind the
feed, the tray and the dock while restoring the view hierarchy that worked.

## Why

Status text is the main thing that moves in this app, and it was reporting
implementation detail — "Painting", "Searching", "Conductor Node". The character
is meant to read as a person; a UI narrating its own subsystems undoes that
every turn.

The latent preview had the same problem in picture form. Watching a blurry
tensor resolve is the model's process, not the character taking a photo, and it
also cost a base64 image per tick over the socket. A calm placeholder is both
truer to the fiction and cheaper.

Putting the strings in `@eidolon/config` was not tidiness — the two status
tables had already drifted, which is what happens when the same idea is written
in two files.

## Evidence

- `bun run lint` clean across 202 files, `bun run typecheck` 5/5,
  `bun run test` 4/4 (167 conductor, 91 canvas), `bun run check:size` clean.
- `tests/connection.test.ts` asserts the shared copy constants rather than the
  old technical strings.
- The keyboard fix is verified structurally: `git diff cf96f4c^` over
  `chat/[id].tsx` now shows only the `ChatBackdrop` import and the removed
  wrapper — the `KeyboardAvoidingView` line and its props are identical to the
  last version that worked. **Device behaviour is unverified.**

## Rejected

- Gender-neutral pronouns (`their voice`). Asked for and reverted in favour of
  wording that needs no pronoun.
- Animating message-card entrances. Every message, dozens a day, and FlashList
  recycles rows so entrances misfire on reused cells.
- Animating theme-studio values. They are numbers the user reads while dragging
  a slider; motion there hinders.
- Two earlier keyboard fixes — `navigationBarTranslucent` on `KeyboardProvider`,
  and removing `automaticOffset`. Both were guesses at the inset arithmetic
  without a device; the first hid the dock entirely. Finding the commit that
  introduced the regression settled it in one step.
