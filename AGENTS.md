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
