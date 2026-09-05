# Authenticated pairing, live socket, and the font system

**Date:** 2026-09-05
**Scope:** apps/canvas, apps/conductor

## What changed

**Pairing**
- `GET /api/pair/verify` on the conductor, authenticated with the pairing token.
- The client verifies against it before storing credentials.
- A real WebSocket client with backoff reconnect (1s to 30s).
- The connection pill reflects actual socket state.
- `GET /api/pairing/qr` serves a browser-rendered code.

**Fonts**
- Both `fontMain` and `fontUI` are editable; bold/italic/medium faces derive
  from them.
- Google Fonts browser with lazy on-scroll previews.
- `fontScale` multiplies the type scale.

## Why

**Any token used to pair.** The client verified by pinging `/health`, which the
conductor does not authenticate, so pairing only proved the host was reachable.
A stale QR or a mistyped token paired successfully and then failed later at the
WebSocket upgrade with nothing explaining why. `/health` stays open for
monitoring; verification moved to a dedicated authenticated endpoint.

**There was no WebSocket client at all.** Nothing in `apps/canvas` referenced
`WebSocket`; `connectionState: "connected"` was a claim based on one HTTP ping,
and the status pill was hardcoded green.

**The QR was unscannable for a measurable reason.** At two columns per module
this payload needs 78 columns; the 4-module quiet zone the spec requires needs
94. On an 80-column terminal it renders with effectively no margin, which
scanners reject against a dark background. Not fixable in the terminal, hence
the browser page.

**Text size does not go through `rem`.** react-native-css resolves `rem` against
a single `__rn-css-rem` variable, so scaling it would have been one line — but
Tailwind's `--spacing` is also rem-based, so that resizes every padding and
margin, not the text. The store publishes explicit `--text-*` pixel values
instead, based on the current computed sizes so scale 1 renders identically.

## Corrections made during the work

- A 1008 close-code branch for rejected tokens was **dead code**: `/ws` returns
  HTTP 401 *before* the upgrade, so the socket only reports a generic abnormal
  close. Replaced with an HTTP re-check after two failures.
- Font derivation can name a face that was never registered. The bundled
  families do not ship `NunitoSans-Medium` or `PublicSans-Italic`, so choosing
  Public Sans for dialogue silently dropped bold runs to the system font. Fixed
  with `BUNDLED_FONT_ALIASES`.
- `.ttf` was assumed for downloads; Google serves CJK Noto faces as `.otf` and
  expo-font rejects a mismatched extension.
- Mounting the colour picker per open was free on web and a visible freeze on
  Android, where it built a nested Dialog plus GestureHandlerRootView each time.

## Evidence

conductor 26 tests, canvas 24 tests, typecheck and lint green. Conductor booted
to confirm the banner and that `/api/pairing/qr` returns 200. Device behaviour
was user-reported; no device was attached here.

## Follow-ups

- `PAIRING_SECRET` defaults to a committed development placeholder and is the
  only thing gating the socket.
- The `betterAuth()` instance is unused — nothing imports it, no routes mount it.
