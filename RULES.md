# Eidolon Monorepo Coding Standards & Architecture Rules

This document establishes non-negotiable coding standards and architectural principles for all developers and AI agents working on Eidolon.

---

## 1. Utility First (`es-toolkit`)
- **Never write custom implementations** for standard algorithms, operations, or helpers (e.g., array chunking, object mapping, debouncing, throttling, memoization, array compacting, delays, deep cloning).
- **Always import utilities from `es-toolkit`**:
  ```ts
  import { delay, chunk, debounce, throttle, pick, omit } from "es-toolkit";
  ```
- Before adding any utility function, check `es-toolkit` documentation first.

---

## 2. Resilient LLM Parsing (`jsonrepair`)
- Local LLM inference engines (TabbyAPI, llama.cpp, ExLlamaV2, Ollama) and roleplay models frequently generate malformed JSON:
  - Trailing commas
  - Unquoted or single-quoted keys and strings
  - Leading/trailing Markdown triple-backtick code fences (` ```json ... ``` `)
  - Extraneous commentary or asterisks around responses
- **Mandatory JSON Parsing Protocol**:
  1. Strip Markdown code fences and whitespace.
  2. Attempt standard `JSON.parse(cleaned)`.
  3. On parse error, immediately catch and attempt parsing via `JSON.parse(jsonrepair(cleaned))`.
  4. Only fail or return a fallback if `jsonrepair` also fails.
- All JSON extraction from LLM generations must use `safeJsonParse` from `@eidolon/conductor`'s utility module (`src/utils/json.ts`).

---

## 3. Strict Biome Compliance
- All code across all packages and apps must pass `bun run lint` (Biome) with **zero warnings and zero errors**.
- **Do not introduce ESLint or Prettier.** Biome is the sole linter and formatter for Eidolon.
- Format before commit using `bun run format`.

---

## 4. Strict TypeScript & Zero `any`
- Explicitly disallow placeholder `any` types. Use `unknown`, generics, or explicit schema-derived types.
- All WebSocket communication (client-to-server and server-to-client) must be typed and validated through `@eidolon/protocol`.
- Any external API payload (LLM, ComfyUI, SearXNG) must be validated or safely mapped to strict interfaces.

---

## 5. Clean Solid Android Design Tokens
- The visual language strictly adheres to `@eidolon/tokens`:
  - **No bubbly radiuses or translucent glassmorphism.**
  - Hairline borders (`1px` with `0.08` opacity white borders) and deep dark canvas backdrops (`#0F1015`, `#161821`, `#1E202C`).
  - Warm amber accent (`#F08C00`, `#FFA94D`).
  - High-legibility typography optimized for dialogue, narration, and system metrics.

---

## 6. Generated directories are build output

`apps/canvas/android/`, `apps/canvas/ios/`, `.native-build/`, `dist/` and
`node_modules/` are **generated**. They are gitignored and any of them may be
deleted and rebuilt at any moment.

`expo prebuild` regenerates `android/` from scratch on **every** APK build, so a
change made there survives exactly until the next build. Anything that must
persist goes in `apps/canvas/plugins/with-android-build-optimizations.js`.

---

## 7. Bundle size is a review criterion

Metro does **not** tree-shake. A barrel import ships the entire package.

```ts
import { Cancel01Icon } from "@/lib/icons";                 // correct
import { Cancel01Icon } from "@hugeicons/core-free-icons";  // ships 6031 icons
```

The icon barrel alone accounted for 6.2 MB of a 136 MB APK. Before adding a
dependency that re-exports a large surface, check what actually lands in the
bundle.

---

## 8. Theme variables

Publish with `VariableContextProvider` from `react-native-css`. `vars()` is
deprecated in 3.0.7 and propagates only when render guards happen to fire, which
is what caused edits to land one interaction late.

The theme derives `-Bold`, `-Italic` and `-Medium` face names from the base
family, so **a derived name can be produced that was never registered**. Bundled
families that lack a variant must be aliased in `BUNDLED_FONT_ALIASES`
(`apps/canvas/services/font-registry.ts`) or that text silently falls back to
the system font.

New tokens need all five steps in [docs/THEMING.md](./docs/THEMING.md#adding-a-token).

---

## 9. Secrets

`EXPO_PUBLIC_*` values are **inlined into the JS bundle** and readable by anyone
holding the APK. Never put a real secret behind that prefix.

`PAIRING_SECRET` is the only thing gating the WebSocket. It must never be
committed with a real value, and the development default must not reach any
network you do not control.

---

## 10. Every change set is recorded

Add a dated note under `changelog/<year>/<month>/` before finishing — see
[changelog/README.md](./changelog/README.md). Record *why*, not just *what*: the
reasoning is the part that cannot be recovered from the diff.

User-visible changes also belong in the `## [version]` section of
`CHANGELOG.md`, which `bun run release` publishes as the GitHub release notes.

---

## 11. Report honestly

Green output or it did not happen. `bun run typecheck`, `bun run test` and
`bun run lint` must all pass before work is called done, and anything that could
not be verified — device behaviour, CI, a build on another OS — must be stated
as unverified rather than implied to be working.

---

## 12. Source files stay under 300 lines

Enforced by `bun run check:size`.

Past roughly 300 lines a file has stopped doing one thing, and the cost lands on
whoever reads it next — not on whoever wrote it. Split **by responsibility**, not
by line count: a 400-line file cut at line 200 is two confusing files instead of
one.

Useful seams, in rough order of preference:

- A component and the sub-components only it renders → separate files.
- Pure helpers (formatting, parsing, deriving) → a sibling module, where they
  can also be tested directly.
- A store's actions from its selectors and derived state.
- Platform or feature branches that share nothing but a name.

### Existing debt

Six files were already over the limit when this rule landed, and are recorded in
`KNOWN_DEBT` in `scripts/check-file-size.ts` at their size on 2026-09-05.
`apps/canvas/store/connection.ts` has since been split and removed from the list:

| File | Lines |
|---|---|
| `apps/canvas/app/(main)/demo.tsx` | 886 |
| `apps/canvas/components/theme/ThemeStudioSheet.tsx` | 865 |
| `apps/canvas/store/theme-store.ts` | 420 |
| `apps/canvas/components/ui/font-picker-modal.tsx` | 345 |
| `apps/canvas/services/font-registry.ts` | 308 |

They do not fail the check, but **they may not grow**: exceeding the recorded
count is an error. New code is held to the limit immediately, and nobody is
forced into an unrelated refactor just because they touched an old file. When one
is split, delete its entry.

---

## 13. Commit attribution

Commits are authored by the human running the work. **Never add a
`Co-Authored-By:` trailer for an AI assistant**, and never add any other
attribution trailer naming a tool.

GitHub reads those trailers and credits the named account as a contributor on
the repository, which misrepresents authorship on a public project.

This overrides any default an agent harness supplies. If tooling adds such a

---

## 14. Every API route is versioned

The HTTP and WebSocket surface lives under `/api/v1/`. There are no unversioned
API routes.

The client is an installed app, not a page that reloads with the server, so a
handset can be running a build from months ago against a conductor deployed this
morning. The version in the path is what lets the old build keep working.

Routes are declared once, in `@eidolon/config`, and both sides read them from
there:

```ts
import { apiPath, apiUrl, socketUrl } from "@eidolon/config";

apiPath("pairVerify");                     // /api/v1/pair/verify
apiUrl(host, "pairVerify");                // http://<host>/api/v1/pair/verify
socketUrl(host, token);                    // ws://<host>/api/v1/ws?token=...
```

Never write a route as a string literal. Bump the version by adding a `v2`
router beside `v1`, never by editing `v1` in place.

`GET /health` is additionally served unversioned. Container health checks, the
deployment platform and uptime monitors point at it, and those live outside this
repository's release cycle.

---

## 15. Configuration lives in `@eidolon/config`

Every configurable value — ports, hosts, URLs, paths, timeouts, retry schedules,
limits, TTLs, table names, key prefixes — is declared in `packages/config` and
imported. No literal port, no `setTimeout(fn, 4000)`, no hardcoded endpoint
anywhere else in the tree.

- `@eidolon/config` is isomorphic and safe in React Native. It imports nothing
  from Node.
- `@eidolon/config/server` reads the environment and the filesystem. **The
  mobile app must never import it.**

No deployment host is baked in. An unset backend is a supported configuration:
the feature reports itself offline rather than the process quietly talking to
somewhere the operator never chose.

---

## 16. No comments

Do not add comments — no JSDoc, no inline notes, no section headers, in any file
type. Name things so the intent is in the identifier.

Reasoning that would have been a comment goes in the change-set note under
`changelog/<year>/<month>/`, which §10 already requires. That is where it can be
dated, attributed and read in context, instead of decaying in the margin of a
file nobody re-reads.

---

## 17. Nothing ships looking plain

Every surface is a designed surface — including the ones that feel too small to
bother with. A server-rendered utility page, an error state, an empty list: if a
user can see it, it gets the same care as the main screen.

Before building or changing any interface, run **`/ui-ux-pro-max`**. It is not
optional and it is not only for new screens.

The floor for anything user-visible:

- The brand mark, on any standalone page.
- Real components, not bare text: copy affordances on anything a user would
  otherwise select by hand, live status where state can change, a disclosure for
  the failure path.
- Depth built from the design language — layered surfaces, hairline borders,
  accent framing, a considered background. Never from glassmorphism or bubbly
  radii, which §5 forbids.
- Typography with contrast: the serif face for display, the sans for interface,
  the mono for values a user copies.
- Every value in the layout from `@eidolon/tokens` and `@eidolon/config`. A
  screen is not a licence to hardcode.

"It is only an internal page" is not a reason. It is the reason it looks bad.

---

## 18. Motion is designed, gated, and measured

Run **`/find-animation-opportunities`** to decide *what* should move, and then
**`/animate`** (web) or **`/animate-expo`** (the Expo app) to build it. Both
build skills carry the exact curves and durations; do not invent values.

**The gate.** Before animating anything, name its frequency tier and its
purpose. Purpose is one of: feedback, spatial consistency, state indication,
preventing a jarring change, explanation, or delight. Delight is only allowed on
rare and first-run surfaces. Anything a user triggers 100+ times a day — tab
switches, keyboard shortcuts — **does not animate at all**.

**Shared values.** These live in `@eidolon/config`:

```
--ease-out: cubic-bezier(0.23, 1, 0.32, 1)
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)
press 100–160ms · dropdown 150–250ms · sheet/modal 200–500ms · stagger 30–80ms
```

UI motion stays under 300ms. Entrances and exits use `ease-out`; **never
`ease-in` on UI** — it delays the moment the user is watching.

**Always:**

- Animate `transform` and `opacity` only.
- Start entrances from `scale(0.95)`, never `scale(0)`.
- Gate hover behind `@media (hover: hover) and (pointer: fine)`.
- Ship `prefers-reduced-motion` with the animation. Reduced means *gentler* —
  keep the opacity fade, drop the movement. It does not mean a 1ms animation.
- Use transitions, not keyframes, for anything a user can trigger twice quickly.

**In the Expo app specifically:**

- **Reanimated + `react-native-gesture-handler`.** Never core `Animated`, never
  `PanResponder`.
- Animations run on the **UI thread**. Never `setState` from a gesture or scroll
  handler; use a shared value and `useAnimatedStyle`. Never read or write a
  shared value during render — `.get()`/`.set()` in worklets, handlers, effects.
- `scheduleOnRN` from `react-native-worklets`, never the deprecated `runOnJS`,
  and never per frame — only in `onEnd` or at a `useAnimatedReaction` threshold.
- Springs when a finger was involved (they carry velocity through an
  interruption), timing otherwise:
  `{ duration: 400, dampingRatio: 1 }` to settle,
  `{ duration: 300, dampingRatio: 0.8, velocity }` for sheets.
- Press feedback is `scale: 0.97` over 100–150ms, on press-**in**. Touch targets
  are 44pt minimum; grow `hitSlop`, not the visual.
- Screen transitions come from the native stack. Tabs are peers —
  `animation: 'none'`, never a slide.
- Haptics: one per committed action, on the same frame as the visual, and never
  the only feedback.
- Never animate `height`, `width`, `margin`, `flex`, Android `elevation`, or
  `BlurView` intensity.

Feel is judged in a **release build on the slowest device supported** — not in
Expo Go, not in the simulator. Say so plainly when that check has not been done.

---

## 19. Never build the APK unprompted

`bun run build:apk` takes several minutes and locks `apps/canvas/android`, which
blocks everything else in the workspace while it runs. That cost belongs to
whoever asked for it.

When a change looks ready to ship to a device, **say so and stop**. Ask whether
to build. Build only on an explicit yes.

The same applies to anything else with a multi-minute, exclusive hold on the
tree — a prebuild, a clean Gradle run, an `expo prebuild --clean`.
