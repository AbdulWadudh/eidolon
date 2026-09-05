# Desktop Phase 0: make the web target real again

**Date:** 2026-09-05
**Scope:** apps/canvas, docs

## What changed

- `apps/canvas/package.json`: `react-native-web` `~0.19.13` → `~0.21.0`,
  resolving to `0.21.2`.
- `apps/canvas/package.json`: `lightningcss` `1.30.1` → `1.29.2`.
- `docs/DESKTOP.md` added — the desktop application decision, evidence and
  phased plan — then corrected against what Phase 0 measured.

No source file changed. The viewport spike described below was reverted.

## Why

[docs/DESKTOP.md](../../../docs/DESKTOP.md) settles the desktop client as one
codebase — `apps/canvas` through `react-native-web` — inside a Tauri v2 shell,
acting as a plain client of a conductor rather than hosting one. Everything in
that plan rests on the web target actually working, and it did not.

**react-native-web.** `expo@57.0.20` pairs SDK 57 with `~0.21.0`
(`apps/canvas/node_modules/expo/bundledNativeModules.json`), but the app pinned
`~0.19.13`. Worse, `0.19.13` declares its peers as `react ^18.0.0` /
`react-dom ^18.0.0` while the app installs `react@19.2.3`. `0.21.2` declares
`react ^18.0.0 || ^19.0.0`, so the conflict is gone. The only other lockfile
movement was `inline-style-prefixer` 6.0.4 → 7.0.1 and `fast-loops` dropped.

**lightningcss.** `apps/canvas/package.json` asked for `1.30.1` while the root
`package.json` pins `1.29.2` in both `resolutions` and `overrides`. The root
already won — `bun.lock` only ever contained `lightningcss@1.29.2` — so the
canvas entry was decorative and misleading. It was aligned *down* to match
reality rather than bumping the root, because the root pin arrived with the
initial canvas scaffold (`70e1dc1`) and was never explained in a changelog, and
because `react-native-css@3.0.7` only requires `>=1.27.0`. Changing a pin whose
reason nobody recorded is not a thing to do casually inside a phase whose whole
value is a two-line rollback.

## Evidence

Baseline captured before any edit, so nothing is misattributed:

| Check | Before | After |
|---|---|---|
| `bun run typecheck` | 5/5 pass | 5/5 pass |
| `bun run test` | 0 fail | 0 fail (canvas 30, conductor 49, config 18) |
| `bun run lint` | **17 errors** | **17 errors** |
| `bun run check:size` | clean | clean |

The 17 lint errors are the pre-existing Windows CRLF problem already recorded as
a follow-up in `2026-09-05-state-out-of-the-repo.md`. Unchanged count means no
regression, not a clean run.

`bunx expo export --platform web` succeeds. The entry bundle is **2.9 MB**, down
from 10,175,247 bytes for the pre-bump export of the same app. Served statically
and loaded in headless Chromium, `/` redirects to `/pairing`, every string
renders, the dark canvas / amber accent / hairline borders / both type faces all
resolve, and the console is empty.

### The viewport spike

The open question was whether responsive layout is achievable in `apps/canvas`
at all, given `react-native-css@3.0.7` caches computed styles per rule-set hash
and a descendant can hold a stale value (trap #2 in `LLM_STATE.md`). If a window
resize hit that cache, desktop layout would be a rewrite rather than a
refinement.

Temporarily adding `md:h-96 lg:h-[500px]` to one element compiled to real CSS:

```
@media (width>=48rem)   md:
@media (width>=64rem)   lg:
```

Measured height of that element, resizing **without reloading**:

```
load at  420px               288px   (h-72)
resize to  900px (no reload) 384px   (md:h-96)
resize to 1280px (no reload) 500px   (lg:h-[500px])
resize back to 420px         288px
```

It reflows in both directions. The staleness trap does not reach the desktop
target: on web, react-native-css emits real CSS into a real stylesheet and the
browser owns media-query evaluation, so the JS cache is not in the path. The
spike was reverted; only the knowledge was kept.

## Rejected and learned

**Bumping the root `lightningcss` pin to 1.30.1.** Tempting, since
`react-native-css` only needs `>=1.27.0` and the canvas manifest already asked
for it. Rejected: the pin has no recorded justification, it is shared by the
native build, and a Phase 0 that can only be rolled back by understanding a
four-month-old pin is not a Phase 0. Recorded as a follow-up instead.

**`hover:` is not portable.** Tailwind v4 compiles `hover:` to
`@media (hover:hover)` and the browser honours it, but
`react-native-css/src/native/conditions/media-query.ts:43-44` is
`case "hover": return true;` — unconditional. A bare `hover:` class on a shared
component applies *always* on the phone. Desktop hover belongs in a `.web.tsx`
file or explicitly gated CSS.

**`rem` is 14 on native and 16 in the DOM.**
`react-native-css/src/native-internal/root.ts:35` sets `__rn-css-rem` to `14`.
Compiled queries keep `rem` units, so `md:` is 768 px on desktop and 672 px on
the phone. Harmless today — `apps/canvas/app.json:7` locks portrait and `:16`
sets `supportsTablet: false`, so nothing above `sm` can fire there — but it means
a pixel number cannot be reasoned about across both targets. Name the breakpoint,
never the pixel.

## Follow-ups

- **No Android build was run.** `react-native-web` is not in the native
  dependency graph so the risk is low, but "no Android regression" is untested,
  not verified.
- The root `lightningcss@1.29.2` pin still has no recorded reason. Someone should
  either justify it in a note or lift it deliberately.
- `apps/canvas/dist/` was left holding a stale export: a backgrounded shell kept
  the directory open on Windows and `expo export` failed with `EBUSY`, so the
  last verified build went to a temp directory instead. It is gitignored build
  output (RULES.md §6) and the next `expo export --platform web` will replace it.
- Four `@rn-primitives/*` dependencies remain unused, and
  `apps/canvas/src/` is still a dead one-line re-export shim. Both are recorded
  in `docs/DESKTOP.md` under Follow-ups.
