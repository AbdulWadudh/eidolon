# Theming

Every colour, radius, font and text size is a token in `@eidolon/tokens`,
published at runtime as CSS variables and consumed by NativeWind classes.

```
ThemeTokens  →  tokensToCssVars()  →  <VariableContextProvider>  →  bg-primary, font-main, text-sm
```

Themes resolve in two scopes: a **global** default, and optional **per-character
overrides** that shadow it.

## Editing tokens

Two surfaces, same components: **Theme Studio** (the sheet, 12 tokens grouped
into surfaces / accents / semantics) and **Theme & Font Lab** (`/demo`, one
section per token). Both are accordions, collapsed by default, so the live
preview stays on screen while editing.

Every token has a reset button. In global scope it restores the factory value
**for the active mode** — the surface and text tokens differ between the dark and
light palettes. In character scope it *removes the override* so the token
inherits from global again, rather than writing a literal that would silently
stop tracking.

## Publishing variables

Use `VariableContextProvider` from `react-native-css`, not `vars()`:

```tsx
<VariableContextProvider value={cssVars}>
  <View className="flex-1 bg-canvas">{children}</View>
</VariableContextProvider>
```

`vars()` is deprecated in react-native-css 3.0.7 and only propagates when
`updateRules` happens to re-run, which depends on render guards firing. When a
guard didn't fire, a subtree kept its old values until some unrelated render
forced it — the "I changed a colour and nothing happened, then changing a
different one applied both" symptom.

### The known staleness bug

react-native-css 3.0.7 caches computed styles per rule-set hash, and the
inherited-variables pseudo-rule sorts last (it has no specificity, so it falls
back to `inlineSpecificity`). A **descendant** reading a variable its ancestor
doesn't itself declare can hold a stale value until an unrelated token forces a
rebuild.

Concretely: the preview card's `bg-card` updated immediately because the card
declares it, but a `Button` inside reading `--color-primary` did not — it kept
rendering the `:root` default until `--card` changed.

3.0.7 is the latest release, so there is nothing to upgrade to. Both preview
blocks carry `key={previewKey}`, derived from every token they render, forcing a
remount on any change. **This is a workaround, not a fix** — keep it scoped to
previews rather than spreading it.

## Fonts

The theme stores two families, `fontMain` (dialogue) and `fontUI` (chrome). The
`-Bold`, `-Italic` and `-Medium` faces are **derived** from them
(`NunitoSans-Regular` → `NunitoSans-Bold`); platform families like `serif` pass
through unchanged so the OS synthesises weight.

> Derivation means a face name can be produced that was never registered. The
> bundled families don't ship every variant — `NunitoSans-Medium` and
> `PublicSans-Italic` don't exist — so `BUNDLED_FONT_ALIASES` in
> `services/font-registry.ts` registers those as aliases of the regular file.
> **Add an alias whenever you add a bundled family that lacks a variant**,
> otherwise that text silently falls back to the system font.

Google Fonts are browsable in-app when `EXPO_PUBLIC_GOOGLE_FONTS_API_KEY` is set.
The whole catalogue is fetched once and cached for 7 days, so search filters in
memory. Installing downloads every derivable face, aliasing missing weights to
regular, and records the family so it re-registers on next launch. Previews load
lazily for on-screen rows only — capped at 3 concurrent and 80 per session, and
CJK families are skipped because they run 5–20 MB *per face*.

## Text size

`fontScale` multiplies the type scale. It publishes explicit `--text-xs` …
`--text-2xl` pixel values rather than changing `__rn-css-rem`, because Tailwind's
`--spacing` is also rem-based — scaling rem would resize every padding and margin
in the app, not the text. Bases are the current computed sizes at rem 14, so
scale 1 renders identically to no scaling at all.

> Arbitrary sizes (`text-[10px]`, `text-[11px]` — 20 usages) compile to fixed
> pixels and **do not scale**. Prefer named steps in new code.

## Adding a token

1. Add the field to `ThemeTokens` and both palettes in `packages/tokens`.
2. Emit it from `tokensToCssVars` in `apps/canvas/store/theme-store.ts`.
3. Map it in `apps/canvas/global.css` if a Tailwind utility should read it.
4. Add a control to both editing surfaces.
5. If the preview should react to it, add it to `previewKey`.
