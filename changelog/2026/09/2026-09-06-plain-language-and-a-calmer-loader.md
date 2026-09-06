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

---

## Follow-up, same day: fonts were never in the app

The release APK rendered in the system sans, and both header lines lost their
last word — "Connect to your Eidolon" showed as "Connect to your".

`apps/canvas/assets/` did not exist. Every font the interface depends on —
Nunito Sans and Public Sans, six faces — was fetched from
`raw.githubusercontent.com` on first launch and cached to the document
directory. A device that could not reach GitHub got no typography at all, fell
back to the system face, and then measured text with one font while drawing it
in another, which is what clipped the trailing word.

The same missing connectivity is why the conductor was unreachable in that
screenshot: both hosts answer `200` from a machine with a working network.

- The six faces are committed under `apps/canvas/assets/fonts/` and declared to
  the `expo-font` config plugin, so they are linked into the binary.
- `initializeFonts` loads them from `require(...)` instead of downloading, and
  the native and web branches collapsed into one path. The function no longer
  touches the filesystem, and `font-registry.ts` fell under the 300-line limit.
- The OTA download path stays, but only for the optional Google Fonts browser,
  which is opt-in and can reasonably need the network.

Pairing errors also stopped telling the truth. `verifyPairing` distinguishes an
unreachable host, a refused token, and a server error; `humanPairingError` only
passes through strings it recognises, so all three arrived as "Could not reach
that address" — a wrong passphrase was reported as a network fault. Those three
now throw `PAIRING_COPY.unreachable`, `.refused` and `.serverError`.

The pairing screen was still using React Native's own `KeyboardAvoidingView`
with `behavior="height"` on Android. The manifest already sets
`adjustResize`, so the window shrinks once from the platform and once more from
the component, pushing the inputs out of view. It now uses the
`react-native-keyboard-controller` one, as the chat screen does.

---

## Second follow-up: the QR advertised an address the phone cannot reach

Pairing still failed after the font fix, and the cause was never on the phone.

`GET /api/v1/pairing` on the deployed conductor returns:

```
{"pairing_url":"eidolon://pair?server=192.168.1.39:3000&token=k79", ...}
```

`generatePairingPayload` always built the payload from `getLocalIp():port`. That
is right on a LAN and wrong everywhere else: a conductor reached through a
domain or tunnel advertises a private address, the phone cannot route to it,
`fetch` throws, and the screen reads "Could not reach that address" — which was
accurate, just not about the address the user typed.

- `PUBLIC_URL` (new, `@eidolon/config/server`) is advertised when set;
  `getPairingHost()` falls back to the LAN address otherwise, so the dev flow is
  untouched. It is also added to the Better Auth trusted origins.
- Set on the deployed instance to `https://eidolon-conductor.k79.quest`.

### The scheme was being thrown away

`verifyPairing` and `pingHealth` both called `stripAuthority(host)` *before*
`apiUrl`/`healthUrl`. Those helpers pick the scheme from the host they are
given, so removing `https://` first meant they always chose `http`:

```
stored:   https://3000.k79.quest
built:    http://3000.k79.quest/api/v1/pair/verify
socket:   ws://3000.k79.quest/api/v1/ws
```

The host is passed through intact now — the helpers strip it themselves, after
deciding. `websocket.ts` was already correct, which is why only the REST calls
were downgraded. Verified by running the builders over both host shapes: a
deployed origin yields `https`/`wss`, a LAN address still yields `http`/`ws`.

This mattered less than it looks for pairing (the proxy answers on both) but
would have broken the chat socket over any HTTPS-only origin.

---

## Third follow-up: the deployed conductor is not the one that matters

`PUBLIC_URL` first went on the Coolify instance, which was the wrong target.
That instance has no LLM, TTS or ComfyUI configured — it is a shell. The
conductor that actually serves chat runs on the dev machine, with all three
backends on `127.0.0.1`, and is reached from outside through a tunnel at
`https://3000.k79.quest`. Both hosts return byte-identical pairing payloads,
which is what gave it away.

So `PUBLIC_URL="https://3000.k79.quest"` belongs in the local
`apps/conductor/.env`, and that is where it now is.

- `generatePairingPayload` percent-encodes both fields. The host is a full URL
  now, so `server=https://...` sat unencoded in a query string; it round-trips
  today and would have broken the moment a host carried a path or a port with
  characters worth escaping.
- `GET /api/v1/pairing`, the QR page and the boot banner advertised
  `getLocalIp():port` directly, so the QR pointed at the tunnel while the
  address printed next to it still read `192.168.1.39:3000`. All three read
  `getPairingHost()` now.

Verified against the running instance through the tunnel:

```
GET /api/v1/pairing
  {"pairing_url":"eidolon://pair?server=https%3A%2F%2F3000.k79.quest&token=k79",
   "server":"https://3000.k79.quest"}

GET /api/v1/pair/verify   Authorization: Bearer k79
  200 {"ok":true,...}
```

The Coolify `PUBLIC_URL` is left set to its own domain — harmless, and correct
for that instance if it is ever given backends.

## Also: no more unprompted APK builds

RULES.md §19. `bun run build:apk` takes minutes and holds an exclusive lock on
`apps/canvas/android` — a second run fails with `EBUSY` and blocks the
workspace. Report that a change is ready for a device and stop; build only when
asked.

---

## Fourth follow-up: the app could never load a plain-HTTP asset

Pairing worked, then no images or voice notes appeared.

`app.json` carried `android.usesCleartextTraffic: true`, and it had no effect.
The built `AndroidManifest.xml` had no `android:usesCleartextTraffic` and no
`networkSecurityConfig`, so the release APK used the API 28+ default: cleartext
HTTP is **blocked**. Media is served from `http://192.168.1.39:9000/...`, so
every asset request failed regardless of which network the phone was on.

Expo sets that attribute from the **`expo-build-properties`** plugin, not from a
bare `android.usesCleartextTraffic` key — confirmed in
`expo-build-properties/src/android.ts`, whose `withAndroidCleartextTraffic` mod
is the only thing that writes it. The bare key was removed rather than left
sitting there looking effective.

```
plugins: [..., ["expo-build-properties", { android: { usesCleartextTraffic: true } }]]
```

Verified by running prebuild alone and reading the result:

```
<application ... android:usesCleartextTraffic="true">
```

This is also what made the conductor address feel "baked in".
`EXPO_PUBLIC_CONDUCTOR_HOST` was never a constraint — it is the initial value of
the host field and its placeholder, nothing more, and a scanned QR overrides it.
But any `http://` address typed into that field failed silently for the same
reason, which looked like the app refusing anything but the compiled-in URL.
With cleartext allowed, an arbitrary LAN address works.

Storage itself was never broken: the object returns `200` and 1.2 MB of webp
over both `127.0.0.1:9000` and `192.168.1.39:9000`. Media URLs are stored
absolute at write time, so they stay LAN-only by decision — the phone loads them
on the same wifi and not over the tunnel.
