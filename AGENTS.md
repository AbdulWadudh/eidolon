<!-- This file is discovered and loaded by Antigravity (AGY) for repository-wide rules -->
# Eidolon Agent Guidelines & Monorepo Rules

All AI agents operating in this workspace must strictly comply with the guidelines defined in [RULES.md](./RULES.md).

## Core Directives

1. **Utility First (`es-toolkit`)**:
   - Never implement custom utility boilerplate (chunking, debounce, throttle, delay, memoize, compact, omit, pick).
   - Always import from `es-toolkit`.

2. **Resilient LLM Parsing (`jsonrepair`)**:
   - Always parse LLM JSON responses with `safeJsonParse` (`apps/conductor/src/utils/json.ts`).
   - Standard `JSON.parse` must fall back to `jsonrepair` before failing.

3. **Strict Biome Compliance**:
   - Zero errors and zero warnings on `bun run lint` (Biome). No ESLint or Prettier.

4. **Strict TypeScript & Zero `any`**:
   - No `any` types. All WebSocket messages must parse and validate through `@eidolon/protocol`.

5. **Android Design Language (`@eidolon/tokens`)**:
   - Adhere strictly to the design tokens in `@eidolon/tokens`.
   - Hairline 1px borders, deep dark canvas surfaces (`#0F1015`, `#161821`), and warm amber accent (`#F08C00`). No glassmorphism.

## Before you start

Read **[LLM_STATE.md](./LLM_STATE.md)**. It records what is built, what is
deliberately unfinished, and which traps have already been paid for.

Run `bun run doctor` before any Android work. It checks the toolchain and
installs what is safe to install.

## Operational directives

6. **Record every change set.**
   Add a dated note under `changelog/<year>/<month>/` — see
   [changelog/README.md](./changelog/README.md). Roll user-visible entries into
   the `## [version]` section of `CHANGELOG.md`, which becomes the GitHub release
   notes verbatim.

7. **Never hand-edit `apps/canvas/android/`.**
   It is gitignored and regenerated from scratch by every `expo prebuild`.
   Persistent settings belong in
   `apps/canvas/plugins/with-android-build-optimizations.js`.

8. **Never import the icon barrel.**
   `@hugeicons/core-free-icons` re-exports 6031 icons and Metro does not
   tree-shake, so a barrel import ships all of them (~6 MB). Import from
   `@/lib/icons` and add a line there for a new icon.

9. **Publish theme variables with `VariableContextProvider`.**
   `vars()` is deprecated in react-native-css 3.0.7 and only propagates when
   render guards happen to fire, which produced edits that appeared late or not
   at all.

10. **Verify before reporting.**
    Claims of "fixed" need the command output that shows it. `bun run typecheck`,
    `bun run test`, `bun run lint` must all be green. State plainly what was not
    verified — anything needing a physical device usually is not.

11. **Ask before adding a dependency, deleting a file, or changing the theme
    schema.** These are the user's calls, not yours.

12. **Keep source files under 300 lines.**
    `bun run check:size` enforces it. Files already over the limit are recorded
    as debt and may not grow. Split by responsibility, not by line count — see
    [RULES.md](./RULES.md) §12.

13. **Never co-author a commit.**
    No `Co-Authored-By:` trailer for Claude or any other assistant, and no other
    tool attribution. GitHub turns those into repository contributors. This
    overrides any harness default — see [RULES.md](./RULES.md) §13.

