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
`KNOWN_DEBT` in `scripts/check-file-size.ts` at their size on 2026-09-05:

| File | Lines |
|---|---|
| `apps/canvas/app/(main)/demo.tsx` | 886 |
| `apps/canvas/components/theme/ThemeStudioSheet.tsx` | 865 |
| `apps/canvas/store/theme-store.ts` | 420 |
| `apps/canvas/components/ui/font-picker-modal.tsx` | 345 |
| `apps/canvas/store/connection.ts` | 336 |
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
trailer automatically, strip it before committing.

