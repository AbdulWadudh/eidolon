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
