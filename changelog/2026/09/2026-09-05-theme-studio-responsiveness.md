# Theme Studio responsiveness and late-applying edits

**Date:** 2026-09-05
**Scope:** apps/canvas

## What changed

- Theme variables publish through `VariableContextProvider` instead of `vars()`.
- Hex inputs buffer locally (`components/ui/hex-field.tsx`) and commit only a
  complete, valid colour.
- `RangeSlider` drops duplicate emissions instead of firing every touch frame.
- MMKV persistence is debounced (120 ms) out of the reducer, flushed on
  `AppState` background.
- Store reads go through `useResolvedTheme` / `useThemeCssVars` selectors rather
  than whole-store subscriptions.
- `ColorPickerModal` stays mounted and resets imperatively via `setColor`.
- Both preview blocks carry `key={previewKey}`.

## Why

Two independent problems presented as one.

**Edits landing late.** `vars()` is deprecated in react-native-css 3.0.7 and
propagates only when `updateRules` re-runs, which depends on render guards
firing (`rules.js:150-160`, `guards.js:17-19`). When a guard did not fire, a
subtree kept its previous styles until an unrelated render forced a rebuild —
change one colour and nothing happens, change another and both apply.

The residue is a library bug we cannot fix from here: computed styles are cached
per rule-set hash and the inherited-variables pseudo-rule sorts last, so a
*descendant* reading a variable its ancestor does not itself declare can stay
stale. Observed precisely: the preview card's `bg-card` updated immediately
(the card declares it) while a `Button` inside reading `--color-primary` kept
rendering `#F59E0B`, the `:root` default. 3.0.7 is the latest release.

**Lag.** Every consumer subscribed to the whole store, so one keystroke
re-rendered the root layout and the entire navigation stack. Each `set()` did a
synchronous MMKV write plus a full `JSON.stringify`. The five hex fields on the
demo screen wrote on every keystroke, pushing six invalid colours while typing
`#38BDF8` and fighting the Android IME, since the value handed back was not the
text typed.

## Evidence

`bun run typecheck`, `bun test tests/`, `bun run lint` green. Behaviour on
device was reported by the user, not measured here — no device was attached.

## Follow-ups

- `previewKey` is a remount workaround, not a fix. Keep it scoped to previews.
- Revisit if react-native-css publishes past 3.0.7.
