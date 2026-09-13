# A translucency token and glass surfaces

**Date:** 2026-09-13
**Scope:** apps/canvas, packages/tokens, packages/config

## What changed

- `ThemeTokens` gains `translucency: number` (0-100, default `0`), registered in
  `SHARED_TOKEN_KEYS` so it inherits persistence, per-character override, reset
  and promote-to-global without new store plumbing.
- `tokensToCssVars` emits `--translucency`, `--surface-alpha` and
  `--surface-blur`; `global.css` carries the opaque `:root` fallbacks.
- `lib/translucency.ts` holds the derivation: intensity to surface alpha, blur
  intensity, blur radius, and hex-to-rgba compositing.
- `components/ui/glass-surface.tsx` is the single surface primitive. Card,
  Input, InputDock, both top bars, the mute control, the voice-note pill, the
  message bubbles and the sheet containers route through it.
- `components/ui/blur-native.ts` resolves `expo-blur` behind a native-module
  probe, so a build without the module linked degrades to a tint instead of
  crashing.
- Theme Studio gets a Glass section (`components/theme/translucency-section.tsx`)
  mirroring the radius control: slider, presets, reset, live badge.
- Modal sheets take a separate, much denser alpha curve (`overlayAlpha`, capped
  at 40% transparent against 75% for in-flow surfaces).
- The audio tab paints its background only down to where the bubble starts, so
  the tuck no longer double-composites.
- `PaintingCard`'s generating animation is now two eased, wide, soft-falloff
  glows drifting out of phase instead of one linear hard-edged band.

## Why

`expo-blur` on Android does not blur what is behind it by default. `BlurView`
needs a `blurTarget` ref pointing at a `BlurTargetView` holding the content to
sample; without one it falls back to `blurMethod: "none"` and renders a plain
semi-transparent view. So Android currently gets a tint, while iOS and web get
real blur.

An earlier attempt wired that target by wrapping the navigation stack in a
`BlurTargetView` at the root and publishing the ref through context. **It
crashed the app natively** on entering chat. The documented arrangement has the
target as a *sibling* background of the blur view; making it an *ancestor* means
every `BlurView` samples a view that contains it, and the recursive draw takes
the process down rather than raising a JS error. That approach is reverted;
`_layout.tsx` is untouched by this change set.

Giving Android real blur therefore means per-screen work — wrapping each
scrollable body in a `BlurTargetView` and rendering the chrome as its sibling —
which is a bigger change than a theme token should smuggle in. It is left as a
decision rather than guessed at.

The primitive keeps its container `View` mounted at all intensities and mounts
only the blur layer above `0`, so children never remount as the slider crosses
the boundary. At `0` the container paints the solid token colour and nothing
else renders, which is byte-for-byte the previous appearance — existing installs
see no change until they opt in.

Surfaces that already carried a redundant `bg-card` in a caller `className` had
it removed; left in place it would paint over the glass.

Two things only broke once surfaces stopped being opaque, because both had been
relying on opacity to hide something.

The audio tab tucks behind its bubble with `marginBottom: -10` and pads its
content clear of the covered strip. Once both were translucent the covered strip
composited twice and the pill's hidden bottom edge showed through. The fix is
not to move the pill: its background is now an absolutely-positioned layer
stopping at `bottom: overlap` with square bottom corners and no bottom border,
so it meets the bubble's top edge exactly and never overlaps it. The silhouette
is unchanged at every intensity, opaque included.

Sheets were unreadable at high intensity — chat text showed straight through
`Mind & Lorebook`. A sheet covers arbitrary content, so it cannot take the same
transparency as a card that sits in the flow; iOS and Material both reach for a
denser material on modals. Hence `overlayAlpha`, a second curve on the same
token rather than a second token.

## Evidence

`bun run typecheck` and `bun run lint` green across all five packages.
`bun --cwd apps/canvas test` green: 218 pass, 0 fail, including a new
`tests/theme-translucency.test.ts` covering the default, migration backfill for
themes stored before the token existed, persistence round-trip, per-character
override, reset, the emitted variables and the derivation maths.

`apps/conductor` has one failing test, `POST /characters/import`, which fails
identically on a clean tree — it needs object storage, which is offline here.
Not introduced by this change.

On-device rendering is **unverified**. No handset was attached and no APK was
built, so the Android blur path, the sheet fallback below, and the cost of
blurred `FlashList` rows have not been measured.

## Follow-ups

- `RULES.md` §5 still reads "No bubbly radiuses or translucent glassmorphism."
  The rule predates this token and now contradicts a shipped feature that
  defaults to off. It needs a decision, not a silent edit.
- `bun run check:size` passes vacuously: its glob is `apps*.{ts,tsx}`, which
  matches zero files. It should be `apps/**/*.{ts,tsx}`. The 300-line rule was
  verified by hand for this change set.
- Android renders a tint, not a blur, until `BlurTargetView` is wired per screen
  as a sibling background. Sheets additionally live in their own native Modal
  windows and would each need their own target.
- Message bubbles are `FlashList` rows. Blur there is the most expensive
  placement in the app and wants a scroll measurement on real hardware.
