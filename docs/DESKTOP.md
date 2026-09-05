# The desktop application

Eidolon needs a native, installable desktop client. This document records the
decision, the evidence in this repository that produced it, and the phased plan
to build it.

A browser-only PWA is **rejected**. It cannot register `eidolon://` as a system
URI scheme, cannot hold a tray icon, and cannot be installed from a signed
artefact. It appears here only as the baseline the recommendation had to beat.

Nothing in this document has been built or measured on a desktop. Every figure
that is not a file in this repository is marked as unmeasured.

## The recommendation in one paragraph

Keep **one codebase**. Ship `apps/canvas` to the desktop through
`react-native-web`, which Expo already builds, and wrap that bundle in a
**Tauri v2** shell in a new `apps/easel` workspace. The desktop app is **just
another client** of a conductor it pairs with over the network — it does not
embed, supervise or bundle a conductor process, and it never opens
`EIDOLON_DATA_DIR`. Pairing replaces the camera with a pasted `eidolon://` URI
plus a protocol handler registered by the shell.

---

## 1. Codebase strategy: one codebase

**Decision: one codebase — `apps/canvas` compiled for web through Expo — not a
second desktop app consuming `packages/*`.**

The deciding reason is that the shared packages are **unbuilt TypeScript
source**, and Metro is the only bundler in this repository configured to compile
them.

`packages/config`, `packages/protocol` and `packages/tokens` all point `main` and
`types` straight at `.ts` files:

```
packages/config/package.json:5-9      "main": "./src/index.ts"
packages/protocol/package.json:5-8    "main": "./src/index.ts"
packages/tokens/package.json:5-8      "main": "./src/index.ts"
```

None of them has a `build` script. The only thing that makes them consumable is
`apps/canvas/metro.config.js:54-61`, which adds the workspace root to
`watchFolders` and both `node_modules` trees to `nodeModulesPaths`. A second
desktop app on Vite or webpack would have to reproduce that — including
transpiling TypeScript found inside `node_modules`, which those bundlers decline
to do by default — and would then own a second, divergent copy of that
configuration forever.

Three further facts push the same way.

**The web target is already declared.** `apps/canvas/package.json:8` has
`dev:web`; `:42` depends on `react-dom`; `:51` on `react-native-web`.

**The web target is already maintained inside components.** Five source files
carry live web branches today: `components/ui/range-slider.tsx:30` swaps in a
native `<input type="range">`, `components/theme/ColorPickerModal.tsx:67,75,107`
adds a system colour picker, `services/font-registry.ts:160-185` registers fonts
by URL when there is no document directory, `store/storage.ts:48-60` reads
`window.localStorage`, and `app/(auth)/pairing.tsx:115` already hides the camera
viewfinder on web. Forking the codebase strands all of it.

**The pipeline demonstrably runs.** `bunx expo export --platform web` completes
and produces `index.html`, one stylesheet and a **2.9 MB** entry bundle
(measured 2026-09-05, after the Phase 0 bump; the pre-bump export of the same
app was 10,175,247 bytes). Grepping the bundle finds `getUserMedia`,
`mmkv.default`, `localStorage` and `eidolon://pair` — the web implementations of
camera and storage are bundled, not stubbed.

### The one thing blocking it today

`apps/canvas/package.json:51` pins `react-native-web` to `~0.19.13`. Expo 57.0.20
pairs SDK 57 with `~0.21.0`, read from
`apps/canvas/node_modules/expo/bundledNativeModules.json`, which reports
`react-native-web: ~0.21.0`, `react-dom: 19.2.3`, `react-native: 0.86.3`. Worse,
`react-native-web@0.19.13` declares its peers as `react ^18.0.0` and
`react-dom ^18.0.0`, while `apps/canvas/package.json:41-42` installs `react@19.2.3`
and `react-dom@19.2.3`.

That is why the web target is "partially wired and unverified". The export in
`dist/` was produced on 2026-09-05 07:26, before commit `8889ec3`
(2026-09-05 22:02) rewrote `store/connection.ts` and added
`store/connection-api.ts`. It proves the pipeline ran once, not that it runs now.

Bumping `react-native-web` to `~0.21.0` is **Phase 0** and gates everything else.
It is not done here: this document changes no dependency.

---

## 2. Native shell: Tauri v2

**Decision: Tauri v2. The deciding reason is [RULES.md §7](../RULES.md#7-bundle-size-is-a-review-criterion) —
bundle size is a review criterion in this repository — combined with the fact
that nothing in the client needs a privileged runtime.**

The desktop client imports no Node builtin. Grepping `apps/canvas/app`,
`components`, `lib`, `services` and `store` for `node:` returns nothing, and
`packages/config/src/index.ts:1-25` re-exports only `./api` and `./defaults`.
`node:os`, `node:fs` and `node:path` are confined to
`packages/config/src/server/env.ts:1` and `packages/config/src/server/paths.ts:1-3`,
behind the separate `./server` export declared at `packages/config/package.json:9`.

So the shell needs exactly five host capabilities: register a URI scheme, hold a
tray icon, post notifications, persist window state, and cache font files on
disk. All five exist in Tauri. Electron's Chromium and Node would be paid for and
left unused.

### Comparison

Installer and memory figures below are the vendors' published ranges and are
**not measured in this repository** — no desktop shell has been built here. The
two numbers that *are* measured are the 2.9 MB web bundle above and the 42.9 MB
Android APK recorded in [docs/BUILD_ANDROID.md](./BUILD_ANDROID.md).

| | Tauri v2 | Electron | RN-Windows + RN-macOS | Fully native per OS |
|---|---|---|---|---|
| Installer size | ~3–10 MB plus the system WebView | ~85–150 MB | ~40–80 MB | smallest |
| Memory at idle | one system WebView, roughly a single Edge or Safari tab | full Chromium plus Node, typically 2–4× that | native, lowest of the portable options | lowest |
| Update mechanism | `tauri-plugin-updater`, signed manifest | `electron-updater`, mature | MSIX / Sparkle, hand-rolled | per-OS, hand-rolled |
| How much of `apps/canvas` survives | all of it, through `react-native-web` | all of it, through `react-native-web` | **the JS, but not the native modules** | none |
| Maintenance for a small team | one Rust crate, three WebView engines to test | one JS process tree, one engine | two RN forks tracking upstream | three separate UIs |
| Linux | WebKitGTK — the weakest of the three engines | Chromium, consistent | not supported | a third platform to write |

### Why not Electron

Electron's advantage is one rendering engine on all three platforms, and it would
be decisive if the app needed Node in the main process. It does not — see the
`node:` grep above. What Electron would cost is roughly fifty times the payload
of the thing being shipped: a 2.9 MB bundle inside a ~150 MB runtime, in a
repository whose RULES.md §7 opens with "Metro does **not** tree-shake. A barrel
import ships the entire package", and whose Android work went to the trouble of
cutting 136.5 MB down to 42.9 MB.

Electron is the correct fallback if Tauri's WebKitGTK build renders the theme
engine incorrectly on Linux. That is the one real risk in this choice, and
Phase 1 exists partly to find out.

### Why not react-native-windows + react-native-macos

This is a hard block, not a preference. **Four of the five native modules the app
depends on ship no Windows implementation at all**, verified by listing the
platform directories inside the installed packages under
`apps/canvas/node_modules/`:

| Package | Version | Platform directories present |
|---|---|---|
| `react-native-mmkv` | 4.3.2 | `android/`, `cpp/`, `ios/` — no `windows/`, no `macos/` |
| `react-native-gesture-handler` | 2.32.0 | `android/`, `apple/` — no `windows/` |
| `react-native-safe-area-context` | 5.7.0 | `android/`, `common/`, `ios/` — no `windows/` |
| `react-native-reanimated` | 4.5.1 | `android/`, `apple/`, `Common/` — no `windows/` |
| `expo-camera` | 57.0.4 | `android/`, `ios/` — no `windows/` |
| `react-native-screens` | 4.26.2 | ships `windows/` |
| `react-native-svg` | 15.15.4 | ships `windows/` |

On top of that, the entire Expo module layer — `expo-router@57.0.19`,
`expo-font@57.0.3`, `expo-haptics@57.0.2`, `expo-file-system@57.0.6` — has no
react-native-windows target, and `apps/canvas/app/_layout.tsx:3` plus every route
in `app/` is built on `expo-router`. This option means rewriting the app, not
porting it.

### Why not a fully native shell per OS

It discards `apps/canvas` entirely and multiplies `packages/tokens`
(`packages/tokens/src/types.ts:37-81` — two full palettes) and the
Theme Studio by three. For a small team it is the most expensive option available
and buys nothing a WebView cannot do.

---

## 3. Client or host: **client**

**Decision: the desktop app is just another client. It pairs with a conductor
over the network, exactly as the phone does. It does not spawn, supervise or
bundle a conductor, and it never opens `EIDOLON_DATA_DIR`.**

Four pieces of evidence decided it.

**1. The conductor is a Bun program, not a Node program.** It cannot run inside
an Electron main process or a Tauri Rust process without a rewrite:

```
apps/conductor/src/db/index.ts:1      import { Database } from "bun:sqlite"
apps/conductor/src/ws/index.ts:3,7    createBunWebSocket() from "hono/bun"
apps/conductor/src/index.ts:35        Bun.file(...)
apps/conductor/src/index.ts:88-92     export default { port, fetch, websocket }
```

Hosting would mean shipping a Bun runtime per platform as a sidecar.

**2. There is no server build artefact to ship.**
`apps/conductor/package.json:5-9` declares `dev`, `test` and `typecheck` — no
`build`. `apps/conductor/Dockerfile:48` runs `CMD ["bun", "run", "src/index.ts"]`
directly against TypeScript source. Embedding means inventing a packaging step
that does not exist yet.

**3. The dependency tree is heavy and platform-specific.**
`@lancedb/lancedb@0.38.0` is a native NAPI addon with seven platform packages in
`bun.lock`: `darwin-arm64`, `linux-x64-gnu`, `linux-arm64-gnu`, `linux-x64-musl`,
`linux-arm64-musl`, `win32-x64-msvc`, `win32-arm64-msvc`. Its optional
dependencies are heavy enough that `apps/conductor/Dockerfile:14-19` has to
delete `onnxruntime-node`, `onnxruntime-web`, `@huggingface/transformers` and the
`sharp` libvips packages after install just to get the image down. Repeating that
surgery inside three desktop installers is a maintenance burden with no ceiling.

**4. Hosting would create a second writer to the same files.**
`packages/config/src/server/paths.ts:6-19` already resolves a **per-OS-user** data
directory — `%LOCALAPPDATA%\eidolon\data` on Windows, `~/.eidolon/data`
elsewhere. A supervised conductor would default to the same path as a conductor
the user started by hand. `apps/conductor/src/db/index.ts:9` sets
`PRAGMA journal_mode = WAL`, which tolerates multiple processes; LanceDB at
`apps/conductor/src/services/lancedb.ts:40` makes no such guarantee. Two
conductors sharing one LanceDB directory is data loss.

### Consequences of choosing client

| Area | Consequence |
|---|---|
| **Pairing** | Unchanged in shape. The desktop stores a host and a token and verifies them at `GET /api/v1/pair/verify`, exactly as `store/connection-api.ts:10-36` does today. Only the delivery of the URI changes — see §6. |
| **Storage** | The desktop owns client state only: `eidolon.server_host`, `eidolon.pairing_token`, `eidolon.is_paired` (`store/connection.ts:29-33`), the theme palettes (`store/theme-store.ts:24-27`), and the installed-font registry (`services/font-registry.ts:6`). No SQLite, no LanceDB, no `EIDOLON_DATA_DIR`. |
| **Offline** | Identical to the phone. `connect()` backs off through `RECONNECT_DELAYS_MS` (`packages/config/src/defaults.ts:17`) and re-verifies over HTTP after two failures (`store/connection.ts:162-171`). The theme engine and the font lab keep working while unpaired, because they read only `appStorage`. There is no offline chat, and there was not one before. |
| **Packaging** | The installer carries the web bundle, the Tauri binary and the WebView bootstrapper. No Bun runtime, no `.node` addons, no per-architecture native database. One artefact per OS and architecture. |
| **The "no terminal" gap** | A desktop user still needs a conductor running somewhere: `bun run dev:conductor`, the Docker image, or a deployment such as `eidolon-conductor.k79.quest`. The desktop app does not close that gap. Its unpaired empty state must say so plainly rather than implying the app is broken. |

### Host mode is deferred, not forbidden

`apps/conductor/.env.example` points `LLM_API_URL` at `http://127.0.0.1:5000/v1`
and `COMFYUI_URL` at `http://127.0.0.1:8188`. The conductor is designed to sit on
the machine that runs the models — which, on desktop, is frequently the machine
running this app. A future **Host mode** that supervises a local conductor is
therefore reasonable. It is written up as Phase 6 with its preconditions and is
explicitly out of scope for v1. See [Decision points](#decision-points).

---

## 4. Breakage inventory

Every entry in `apps/canvas/package.json`, with a verdict. **Works** means the
package resolves and functions under `react-native-web` with no code change;
**Shim** means a branch or replacement is needed; **Blocks** means it cannot work
on desktop as currently used.

Metro resolves `.web.ts` and `.web.tsx` ahead of the bare extension for the web
platform, which is the mechanism most of these rely on. Counts of web-suffixed
files were taken from the installed package under `apps/canvas/node_modules/`.

### Dependencies

| Package | Version | Verdict | Evidence |
|---|---|---|---|
| `@eidolon/config` | `workspace:*` | Works | `packages/config/src/index.ts:1-25` re-exports only `./api` and `./defaults`; no `node:` import. Node access sits behind `./server` (`packages/config/package.json:9`). |
| `@eidolon/protocol` | `workspace:*` | Works | Depends on `zod@^3.24.1` alone (`packages/protocol/package.json:14-16`). Pure JS. |
| `@eidolon/tokens` | `workspace:*` | Works | Object literals only (`packages/tokens/src/types.ts:37-81`, `packages/tokens/src/geometry.ts:1-6`). |
| `@hugeicons/core-free-icons` | `^4.3.0` | Works — keep the §7 discipline | Icon path data. Must stay behind `apps/canvas/lib/icons.ts:1-12`; the barrel is 6031 icons and there is no R8 pass on the web target to catch a slip. |
| `@hugeicons/react-native` | `^1.0.16` | Works | Used at `components/common/icon.tsx:1`; renders through `react-native-svg`, whose peer range `>=12.0.0` is satisfied by 15.15.4. |
| `@rn-primitives/dialog` | `^1.5.2` | **Unused** — remove or wire up | No import in `app/`, `components/`, `lib/`, `services/` or `store/`. Its declared peer `@rn-primitives/portal` is not installed at all. |
| `@rn-primitives/dropdown-menu` | `^1.5.2` | **Unused** | As above. |
| `@rn-primitives/slot` | `^1.5.2` | **Unused** | As above. |
| `@rn-primitives/types` | `^1.5.2` | **Unused** | As above. |
| `class-variance-authority` | `^0.7.1` | Works | Pure JS; `components/ui/button.tsx:1`, `components/ui/badge.tsx:1`. |
| `clsx` | `^2.1.1` | Works | Pure JS; `lib/utils.ts:1`. |
| `es-toolkit` | `^1.52.0` | Works | Pure JS; `lib/utils.ts:2`, `app/(main)/chat/[id].tsx:1`. |
| `expo` | `57.0.20` | Works | Ships the web bundler; `expo/bundledNativeModules.json` names `react-native-web` as a first-class SDK 57 target. |
| `expo-asset` | `~57.0.16` | Works | 15 web-suffixed files in the installed package. |
| `expo-camera` | `~57.0.4` | **Shim** — no camera on desktop | 10 web-suffixed files, and the exported bundle contains `getUserMedia`, so it loads. But a desktop has no QR to point at, and `app/(auth)/pairing.tsx:115` already gates the viewfinder behind `Platform.OS !== "web"`. Desktop pairing replaces it — see §6. |
| `expo-constants` | `~57.0.17` | Works | 5 web-suffixed files. Not imported by any source file today. |
| `expo-file-system` | `~57.0.6` | **Shim, already written** | The legacy module ships `ExponentFileSystem.web.d.ts`. `documentDirectory` is undefined on web, and `services/font-registry.ts:160-185` and `:273-279` already take that branch and register fonts by remote URL. Desktop inherits a working path but loses on-disk font caching — see [Follow-ups](#follow-ups). |
| `expo-font` | `~57.0.3` | Works | 20 web-suffixed files. `Font.loadAsync` accepts a URL on web, which is exactly what `services/font-registry.ts:177-179` relies on. |
| `expo-haptics` | `~57.0.2` | **Shim — no-op** | 3 web-suffixed files, but desktop hardware has no haptic engine. `app/(auth)/pairing.tsx:49,55,77,83` already wraps every call in `try`/`catch`, so nothing breaks. §18 requires haptics never be the only feedback; on desktop it is no feedback, so the visual confirmation must carry the whole signal. |
| `expo-linking` | `~57.0.9` | **Shim — must be wired up** | 20 web-suffixed files, but **nothing in the app imports it**: grepping `app/`, `components/`, `store/`, `services/` and `lib/` for `Linking`, `useURL` or `getInitialURL` returns nothing. There is no deep-link handler anywhere today. Desktop needs one, fed by the shell's protocol handler — see §6. |
| `expo-router` | `~57.0.19` | Works | 17 web-suffixed files; drives every route (`app/_layout.tsx:3`, `app/index.tsx:1`). On web it maps routes to URLs, which is what the `eidolon://` handler will navigate. |
| `expo-status-bar` | `~57.0.1` | **Shim — no-op** | 3 web-suffixed files. `app/_layout.tsx:61` sets the status-bar style; a desktop window has no status bar. Harmless, but the equivalent — titlebar theming — becomes a shell concern. |
| `nativewind` | `5.0.0-preview.4` | Works | `metro.config.js:73` wires `withNativewind`, and the export produced `dist/_expo/static/css/global-559836e0cc4383b36ce7d2f79e0ee739.css`. |
| `react` | `19.2.3` | Works | Matches `expo/bundledNativeModules.json`. |
| `react-dom` | `19.2.3` | Works | Matches `expo/bundledNativeModules.json`. |
| `react-native` | `0.86.3` | Works, by aliasing | Metro aliases `react-native` to `react-native-web` on the web platform. Matches `expo/bundledNativeModules.json`. |
| `react-native-css` | `^3.0.7` | Works | Ships `src/runtime.ts` beside `src/runtime.native.ts`, and a `src/web/` directory (`api.tsx`, `assign-style.ts`, `index.ts`, `metro.ts`). `VariableContextProvider` (`app/_layout.tsx:7,62`) is the web-safe API RULES.md §8 already mandates. |
| `react-native-gesture-handler` | `~2.32.0` | Works | `src/RNGestureHandlerModule.web.ts`, `src/findNodeHandle.web.ts`, `src/PlatformConstants.web.ts` plus a complete `src/web/` implementation. Used at `app/_layout.tsx:1,8` and `components/theme/ColorPickerModal.tsx:3`. |
| `react-native-mmkv` | `^4.3.2` | Works — with a **key-namespace caveat** | `src/createMMKV/createMMKV.web.ts` implements the entire surface over `localStorage`, falling back to an in-memory `Map` when `localStorage` is unavailable (`src/web/getLocalStorage.ts`). But it prefixes every key with the instance id followed by a backslash, so `createMMKV({ id: "eidolon-canvas-store" })` at `store/storage.ts:105` writes under a different namespace than the `MemoryStorage` fallback at `store/storage.ts:70-77`, which writes the bare key. A desktop build must pick one path and never change it, or every stored setting silently resets. |
| `react-native-reanimated` | `4.5.1` | Works, and **is not currently used** | Web platform files exist: `src/ReanimatedModule/index.web.ts`, `src/fabricUtils.web.ts`, `src/platformFunctions/*.web.ts`. No source file in `apps/canvas` imports it — it arrives transitively through `reanimated-color-picker` and `expo-router`. RULES.md §18's Reanimated clause is therefore aspirational today, which matters for §8 below. |
| `react-native-safe-area-context` | `~5.7.0` | **Shim — insets are always zero** | `src/NativeSafeAreaProvider.web.tsx` and `src/SafeAreaView.web.tsx` exist, so it resolves. But a desktop window has no notch: every `SafeAreaView` in the app (`app/(auth)/pairing.tsx:14`, `app/(main)/index.tsx:4`, `app/(main)/chat/[id].tsx:5`, `components/theme/ThemeStudioSheet.tsx:5`) collapses to zero padding and the layout loses all of its edge breathing room. Desktop needs real window padding from `@eidolon/tokens`, not an inset. |
| `react-native-screens` | `~4.26.0` | Works | 147 web-suffixed files in the installed package. Not imported directly; `expo-router` consumes it. |
| `react-native-svg` | `15.15.4` | Works | 14 web-suffixed files. Used only as a type at `components/common/icon.tsx:2`. |
| `react-native-web` | `~0.19.13` | **Blocks until bumped** | Expo 57 pairs with `~0.21.0` (`expo/bundledNativeModules.json`), and 0.19.13 declares peers `react ^18.0.0` / `react-dom ^18.0.0` against the installed `react@19.2.3` (`apps/canvas/package.json:41-42`). This is Phase 0. |
| `react-native-worklets` | `0.10.1` | Works | Ships `platformChecker.ts` beside `platformChecker.native.ts`, `runtimes.ts` beside `runtimes.native.ts`, `threads.ts` beside `threads.native.ts` — the non-`.native` files are the web implementations. Pinned by root `package.json:44,48`. |
| `reanimated-color-picker` | `^5.1.3` | **Shim, already written** | No web-suffixed files at all; it is pure Reanimated plus Gesture Handler, both of which have web builds, so it should render. But `components/theme/ColorPickerModal.tsx:107-120` already sidesteps it with a native `<input type="color">` on web. Desktop should keep that branch and treat the wheel as the fallback. |
| `tailwind-merge` | `^3.6.0` | Works | Pure JS; `lib/utils.ts:4`. |
| `tailwindcss` | `^4.1.12` | Works | Build-time only; consumed through `global.css:1-3`. |
| `zustand` | `^5.0.15` | Works | Pure JS; `store/connection.ts:2`, `store/theme-store.ts:3`. |

### Dev dependencies

| Package | Version | Verdict | Evidence |
|---|---|---|---|
| `@eidolon/tsconfig` | `workspace:*` | Works | Configuration only (`packages/tsconfig/package.json:5-9`). |
| `@tailwindcss/postcss` | `^4.3.3` | Works | Build-time; `postcss.config.js:3`. |
| `@types/bun` | `latest` | Works | Types only; referenced at `apps/canvas/tsconfig.json:6`. |
| `@types/react` | `~19.2.4` | Works | Types only. |
| `babel-preset-expo` | `~57.0.10` | Works | Build-time. Note there is **no `babel.config.js`** in `apps/canvas` — the preset is applied by Expo's default transformer. |
| `lightningcss` | `1.30.1` | Works — but the version is **contradictory** | `apps/canvas/package.json:64` asks for `1.30.1` while the root `package.json:41,45` pins `lightningcss` to `1.29.2` in both `resolutions` and `overrides`. The root wins. It compiles `global.css` for both targets, so a mismatch here surfaces as CSS that differs between native and desktop. |
| `postcss` | `^8.5.28` | Works | Build-time. |
| `typescript` | `~6.0.3` | Works — but **disagrees with the workspace** | Every other package pins `^5.7.3` (`packages/config/package.json:18`, `packages/protocol/package.json:20`, `packages/tokens/package.json:15`, `apps/conductor/package.json:26`, root `package.json:38`). Not a desktop blocker; recorded because desktop work adds files on both sides of that line. |

### Summary

Nothing in the dependency list hard-blocks the desktop except
`react-native-web@0.19.13`, which is a version bump. Four packages are dead
weight (`@rn-primitives/*`), five need a desktop branch (`expo-camera`,
`expo-haptics`, `expo-linking`, `expo-status-bar`,
`react-native-safe-area-context`), two already have one written
(`expo-file-system`, `reanimated-color-picker`), and one carries a silent
data-migration hazard (`react-native-mmkv`).

---

## 5. Screens that differ by viewport

Two kinds of divergence exist and they need different mechanisms. Conflating
them is how a codebase forks.

**Divergence by capability** — the desktop has no camera, no haptics and no safe
area, but has a pointer, a keyboard, a tray and multiple windows. This is a
build-time split.

**Divergence by width** — a 1600 px window shows the Theme Studio beside the
preview rather than above it. This is a runtime concern and must not produce a
second file.

### The convention

Because a browser-only PWA is rejected, **the web target *is* the desktop
target**. That collapses the problem: Metro's existing `.web.tsx` resolution is
the platform split, and no new suffix is needed.

```
app/(auth)/pairing.tsx           phone: camera viewfinder
app/(auth)/pairing.web.tsx       desktop: paste-a-link + protocol handler
components/pairing/*.tsx         everything both of them render
```

Four rules make that safe:

1. **Only route files and presentational components may have a `.web.tsx`
   sibling.** `store/`, `services/` and `packages/*` never do. Every platform
   variant imports the same store and the same protocol schemas, so state and
   business logic have exactly one implementation by construction.
2. **Shared sub-components live under `components/<feature>/`.** A `.web.tsx`
   file that is not mostly composition is a signal the split is in the wrong
   place.
3. **Width differences stay in one file.** `react-native-css@3.0.7` ships
   `src/compiler/media-query.ts` and `src/native/conditions/media-query.ts`, so
   Tailwind's `md:` and `lg:` prefixes already compile on both targets. Use
   those, plus a single `lib/breakpoints.ts` hook wrapping
   `useWindowDimensions()` for the cases a class cannot express. Breakpoint
   values are configuration and belong in `@eidolon/config` per §15.
   **Verified — see below.**
4. **Retire inline `Platform.OS` from layout.** `components/ui/range-slider.tsx:30`
   and `components/theme/ColorPickerModal.tsx:67,75,107` branch inline today. That
   was right when web was an afterthought; once desktop is a shipped target the
   branches get long and both halves get read by everyone. Move them to
   `.web.tsx` siblings as each component is touched, not in one sweep.

### Verified: breakpoints work, and they reflow on resize

Measured on 2026-09-05 against a production `expo export --platform web` build
served statically, driven through a headless Chromium.

Adding `md:h-96 lg:h-[500px]` to one element compiled to real CSS in the exported
stylesheet, alongside the platform queries the app already emitted:

```
@media (width>=48rem)   <- md:
@media (width>=64rem)   <- lg:
@media android
@media ios
```

The element's measured height, loading fresh at each width:

| Viewport | Measured height | `md` matched | `lg` matched |
|---|---|---|---|
| 420 px | 288 px (`h-72`) | false | false |
| 900 px | 384 px (`md:h-96`) | true | false |
| 1280 px | 500 px (`lg:h-[500px]`) | true | true |

And **resizing the window without reloading**, which was the real question:

```
load at  420px               -> 288px
resize to  900px (no reload) -> 384px
resize to 1280px (no reload) -> 500px
resize back to 420px         -> 288px
```

The concern that `react-native-css@3.0.7`'s per-rule-set style cache
([LLM_STATE.md](../LLM_STATE.md) trap #2) might hold stale values across a resize
**does not apply to the desktop target**. On web, react-native-css emits real CSS
into a real stylesheet and the browser owns media-query evaluation — its JS cache
is not in the path at all. That cache remains a live concern for the native
runtime, where `vw`/`vh` are observables updated from
`Dimensions.addEventListener("change", …)`
(`react-native-css/src/native/reactivity.ts:197-208`); the phone is locked to
portrait (`apps/canvas/app.json:7`) with `supportsTablet: false` (`:16`), so no
breakpoint above `sm` can fire there today regardless.

Two findings that change how the rules should be written:

- **`hover:` is gated correctly on web and broken on native.** Tailwind v4
  compiles `hover:` to `@media (hover:hover)`, which the browser honours. But
  `react-native-css/src/native/conditions/media-query.ts:43-44` is literally
  `case "hover": return true;` — unconditional. A bare `hover:` class therefore
  applies *always* on the phone. Desktop hover styling belongs in a `.web.tsx`
  file or in raw gated CSS, never a bare Tailwind `hover:` prefix on a shared
  component.
- **`rem` differs between the runtimes.**
  `react-native-css/src/native-internal/root.ts:35` sets `__rn-css-rem` to `14`,
  while the DOM default is `16`. The compiled queries keep `rem` units, so
  `md:` is 768 px on desktop and 672 px on the phone. Harmless today for the
  reason above, but it means a single pixel number cannot be reasoned about
  across both targets — always name the breakpoint, never the pixel.

The app also renders correctly end to end on `react-native-web@0.21.2` with **zero
console errors**, and the design tokens survive the port: dark canvas, amber
accent, hairline borders and both type faces all resolve. What it does *not* have
is a desktop layout — at 1440 px the card is centred while the disclosure rows
stretch edge to edge. That is Phase 3, and it is a composition problem, not a
capability one.

### The two screens named in the brief

**Chat** (`app/(main)/chat/[id].tsx`, 91 lines) is currently a placeholder: a top
bar and an empty-state card. It has no chat UI yet — [LLM_STATE.md](../LLM_STATE.md)
records the client chat surface as deliberately unfinished. This is an advantage.
Build it once, responsive from the start, with a transcript column that gains a
persistent composer and an optional side rail past the `lg` breakpoint. No fork
needed, because there is nothing to fork.

**Theme Studio** (`components/theme/ThemeStudioSheet.tsx`, 731 lines) is the hard
one. It is a full-screen `Modal` (`:3`) wrapping a `SafeAreaView` (`:5`), built
as a collapsed accordion specifically so the live preview stays on screen on a
phone (`:67-69`). On a desktop that constraint disappears: the controls and the
preview should sit side by side with nothing collapsed. That is a genuinely
different composition, not a media query.

It must be **split before it is adapted**. At 731 lines against a recorded debt
budget of 736 in `scripts/check-file-size.ts:25`, there are five lines of
headroom. The split is by responsibility, as §12 requires: the token group
sections, the preview block, and the scope/mode switcher each become their own
module under `components/theme/`, leaving a thin `ThemeStudioSheet.tsx` and a
`ThemeStudioWindow.web.tsx` that compose the same parts into different layouts.

---

## 6. Pairing and deep links

A desktop has no camera. Everything else about pairing already works.

### What already exists

`parsePairingUri` (`store/connection.ts:35-56`) takes a **string** and validates
it against `PAIRING.uriScheme` from `packages/config/src/defaults.ts:6-8`. It has
no dependency on the camera whatsoever — `app/(auth)/pairing.tsx:37-64` merely
feeds it `result.data` from a barcode scan. `setManualConnection`
(`store/connection.ts:212-246`) already accepts a typed host and token and is
wired to a form at `app/(auth)/pairing.tsx:175-209`.

On the conductor side, `renderPairingPage` (`apps/conductor/src/pairing/page.ts:205-262`)
already renders copy-to-clipboard rows for **Server** and **Token**
(`:243-244`, implementation at `:163-182`), and the boot banner prints the full
deep link (`apps/conductor/src/index.ts:68`).

### The desktop flow

1. The user opens `http://<host>:<port>/api/v1/pairing/qr` in a browser — the
   page the terminal banner already points at (`apps/conductor/src/index.ts:78`).
2. **Preferred path:** they click **Pair this computer**. The browser follows
   `eidolon://pair?server=…&token=…`, the OS hands it to the registered
   desktop app, and the app calls `pairFromUri` with the string it receives.
3. **Fallback path:** they click the new **copy** button on the deep link and
   paste it into a single field on the desktop pairing screen. `parsePairingUri`
   handles the rest unchanged.
4. **Last resort:** the existing Server and Token fields, already built.
5. Either way the app calls `GET /api/v1/pair/verify` through
   `store/connection-api.ts:10-36` before storing anything, and opens
   `socketUrl(host, token)` on success. Nothing about `/api/v1/` changes.

Paste is the primary affordance, not the fallback, because it works before the
protocol handler is registered — which matters on first run, on a portable
build, and on any Linux desktop where `xdg-mime` did not take.

### The one conductor change required

`apps/conductor/src/pairing/page.ts:242-245` renders copy rows for Server and
Token but **not for the payload**. The full `eidolon://pair?…` string is passed
into the function as `payload` (`:205`) and is currently only encoded into the
QR SVG (`:206`).

Add a third `copyRow` for the payload and an anchor to it:

```
${copyRow("Pairing link", payload, s * 6)}
```

The file is 262 lines, so there are 38 lines of headroom under §12. Per §17 this
is a user-visible surface: run `/ui-ux-pro-max` before touching it, and reuse the
existing `.copy` component and `UI_MS.copyFeedback` (`packages/config/src/defaults.ts:52`)
rather than inventing a second copy affordance.

No other conductor change is needed. Authentication, the token check
(`apps/conductor/src/auth/index.ts:45-57`) and the socket upgrade guard
(`apps/conductor/src/ws/index.ts:18-27`) are transport-agnostic and already
correct for a desktop client.

### Registering `eidolon://` per OS

The scheme is already declared once, at `packages/config/src/defaults.ts:6-8`
(`PAIRING.uriScheme = "eidolon://pair"`), and `apps/canvas/app.json:5` sets
`"scheme": "eidolon"` for the mobile builds. The desktop shell declares the same
value; per §15 it must read it, not restate it.

With Tauri, one declaration in `tauri.conf.json` plus `tauri-plugin-deep-link`
covers all three, but what the OS does with it differs:

| OS | Mechanism | Notes |
|---|---|---|
| **Windows** | Installer writes `HKEY_CLASSES_ROOT\eidolon` with a `URL Protocol` value and a `shell\open\command` pointing at the exe. | Per-user under `HKCU\Software\Classes` avoids needing admin. A portable build must self-register on first run, and should offer to unregister. The launch arrives as `argv[1]` on a **fresh process**, so the shell needs single-instance handling to forward it to the running window. |
| **macOS** | `CFBundleURLTypes` in `Info.plist`, generated from the Tauri config. | LaunchServices registers it when the bundle is first moved to `/Applications` and opened. The URL arrives through the `openURLs` app delegate callback, **not** through `argv` — a running app receives it without restarting. Registration is unreliable while the app runs from a quarantined download; see §7 on notarisation. |
| **Linux** | A `.desktop` entry with `MimeType=x-scheme-handler/eidolon=`, plus `xdg-mime default eidolon.desktop x-scheme-handler/eidolon`. | Handled automatically for `.deb` and `.rpm`. **AppImage does not register anything** — if AppImage is a shipping format, paste must be the documented path there. Behaviour also varies by desktop environment; GNOME and KDE resolve it differently from a bare window manager. |

### The client-side handler

`expo-linking@57.0.9` is already a dependency (`apps/canvas/package.json:37`) and
is imported by nothing. Wire it in a **new** `store/deep-link.ts` rather than in
`store/connection.ts`: that file is 264 lines, and although RULES.md §12 and
`scripts/check-file-size.ts:28` both record its budget as 336, it is no longer
over the limit and so is held to 300 like any other file. Adding a handler there
would leave it uncomfortably close.

The handler subscribes once from `app/_layout.tsx` — which is 70 lines and has
ample room — and covers both entry shapes: an initial URL captured at cold start
(Windows and Linux) and a URL delivered to a running instance (macOS, and Windows
after single-instance forwarding).

---

## 7. Shipping a desktop binary

### Signing and notarisation

| OS | What is required | Consequence of skipping it |
|---|---|---|
| **Windows** | An OV or EV code-signing certificate, applied with `signtool`. EV certificates require a hardware token or a cloud HSM. | SmartScreen shows "Windows protected your PC" on every download until the binary accrues reputation. An OV certificate builds reputation slowly; EV starts with it. |
| **macOS** | An Apple Developer ID Application certificate, a hardened-runtime build, then `notarytool submit --wait` and `stapler staple`. | Gatekeeper refuses to open the app at all on macOS 10.15+. There is no "run anyway" path a normal user will find. Requires a paid Apple Developer account. |
| **Linux** | Nothing mandatory. Optionally a detached GPG signature and a checksum file. | None, by convention. |

**This is a decision point, not a recommendation.** See below.

Note that Android release builds are still signed with the debug keystore
([docs/BUILD_ANDROID.md](./BUILD_ANDROID.md), "Signing"), so the repository has no
release-signing story on any platform yet. Desktop signing should be solved
alongside it rather than separately.

### Auto-update

`tauri-plugin-updater` polls a JSON manifest and verifies an Ed25519 signature
over each artefact. The private key stays out of the repository; only the public
key is embedded in the build.

Two channels, both declared in `@eidolon/config` per §15 so no host is baked into
the source — which matters here more than usual, because `bun run release`
already publishes to GitHub Releases and `RULES.md §15` explicitly makes an unset
backend a supported configuration:

- `stable` — what `bun run release` publishes.
- `nightly` — optional, off by default.

`bun run release` (`scripts/release.ts`) already bumps the version, reads
`## [version]` from `CHANGELOG.md` as release notes, and refuses to publish on a
dirty tree. Desktop artefacts should join that script rather than acquire a
parallel one, and the version must keep coming from `expo.version` in
`apps/canvas/app.json:6` so the desktop, the APK and the release tag never
disagree.

### Installer formats

| OS | Format | Why |
|---|---|---|
| Windows | NSIS `.exe` | Per-user install without admin; Tauri's default; smaller than MSI. |
| Windows | MSI (optional) | Only if managed deployment is ever needed. |
| macOS | `.dmg` containing a signed, notarised `.app` | The expected shape. Universal binary covers Intel and Apple Silicon in one artefact. |
| Linux | `.deb` and `.rpm` | These register the `x-scheme-handler` automatically. |
| Linux | AppImage (optional) | Portable, but registers nothing — pairing there is paste-only. |

### OS integrations worth having on day one

Ranked by what the app actually does. The first three are load-bearing; the rest
are polish and can land in Phase 5.

1. **Window-state persistence.** A desktop app that forgets its size and position
   feels broken. `tauri-plugin-window-state`. Defaults go in `@eidolon/config`.
2. **`eidolon://` protocol handler.** Without it §6 has only the paste path.
3. **Single-instance.** Launching the app twice must focus the existing window
   and forward the URL, not open a second one holding a second WebSocket. The
   conductor counts connections (`apps/conductor/src/ws/index.ts:9-13`) and a
   duplicate would be visible in `/api/v1/pairing/status`.
4. **Tray icon with connection state.** The app already computes exactly the
   right four states at `app/(main)/index.tsx:25-30` — connected, connecting,
   error, disconnected — with colours from the theme. The tray is that pill,
   outside the window.
5. **Native notifications.** For reconnection and for a completed generation.
   Must be gated: §18's frequency rule applies to notifications at least as
   strongly as to animation.
6. **Global shortcut.** One, to summon the window. Anything more is a
   configuration surface nobody asked for.
7. **Multi-window.** Deliberately last. The Theme Studio in its own window is the
   obvious first candidate, but `store/theme-store.ts` is a single in-process
   zustand store; a second window is a second JS context and would need the
   theme synchronised across them. Do not attempt it before Phase 5.

---

## 8. Rules impact

Proposed wording, ready to paste. Each block is an addition to the named section
of [RULES.md](../RULES.md) unless it says otherwise. [AGENTS.md](../AGENTS.md)
carries a short mirror of §§14–18 and needs the same edits in summary form.

### §5 — Clean Solid Android Design Tokens

Append:

> The desktop client renders the same tokens through a WebView, where a pointer
> and a keyboard exist. Hover, focus and cursor states are therefore part of the
> design language, not additions to it:
>
> - Hover is gated behind `@media (hover: hover) and (pointer: fine)` and never
>   carries information that is not also available without it.
> - Every interactive element has a visible `:focus-visible` ring drawn from the
>   accent token, never the browser default outline.
> - Cursors are `default` for text and `pointer` only for things that navigate or
>   commit. Never `pointer` on a whole card.
> - A desktop window has no safe-area inset. Window padding comes from
>   `@eidolon/tokens`; `SafeAreaView` resolves to zero there and must not be
>   relied on for edge spacing.

### §12 — Source files stay under 300 lines

Append after the existing debt table:

> A `.web.tsx` file and its `.tsx` sibling are counted separately, and each is
> held to the limit on its own. A platform variant that is not mostly composition
> is a sign the split is in the wrong place: move the shared body into
> `components/<feature>/` and leave both variants thin.
>
> The debt table records a file's size at the moment the rule landed. It is not a
> licence to grow a file up to that number — a file under 300 lines is held to
> 300 regardless of what the table says.

The last paragraph is needed because `apps/canvas/store/connection.ts` is
recorded at 336 in both RULES.md §12 and `scripts/check-file-size.ts:28` but is
now 264 lines, and the current rule text can be read as granting it 72 lines of
free growth.

### §14 — Every API route is versioned

Append:

> The `eidolon://` URI scheme is a client route surface and is versioned by the
> same reasoning: an installed desktop app can be months older than the conductor
> that generated the link it is being handed. The scheme, its path and its
> parameter names are declared once in `@eidolon/config` — `PAIRING.uriScheme`
> today — and both the conductor that emits the link and every client that parses
> one read them from there. A new parameter is added; an existing one is never
> repurposed.

### §15 — Configuration lives in `@eidolon/config`

Replace the sentence "**The mobile app must never import it.**" with:

> **No client may import it** — not the mobile app, not the desktop renderer, not
> the desktop shell's JavaScript side. `@eidolon/config/server` reads the
> environment and the filesystem of the machine the conductor runs on, which on
> desktop is frequently the same machine the client runs on. That coincidence is
> exactly what makes the mistake easy and its consequences invisible until the
> app is installed somewhere else.

And append:

> Desktop values are configuration like any other: default window size and
> minimum size, layout breakpoints, tray tooltip strings, the update channel and
> its manifest URL, the global shortcut. They are declared in `@eidolon/config`
> and read by both the shell and the renderer. No update host is baked in; an
> unset update channel means the app does not check for updates, and says so.

### §16 — No comments

Replace "in any file type" with:

> in any file type — TypeScript, JavaScript, CSS, Rust, TOML, shell, or a
> `tauri.conf.json` masquerading as documentation through unused keys.

### §17 — Nothing ships looking plain

Append to the list of floors:

> On desktop, the surfaces that get forgotten are the ones the phone does not
> have. Each of these is a designed surface:
>
> - The window before it has content — first paint, and the unpaired state.
> - The tray icon and its menu.
> - Every native notification: title, body and the action it offers.
> - The updater's prompt, its progress and its failure.
> - The window at its minimum size, which is a layout you chose whether or not
>   you thought about it.
>
> "Nobody looks at the tray menu" is not a reason. It is the reason it looks bad.

### §18 — Motion is designed, gated, and measured

The existing "**In the Expo app specifically**" block stays as written. Add a
counterpart after it:

> **On desktop specifically:**
>
> - The desktop runs `react-native-web`. There is no UI thread to offload to:
>   Reanimated's web build drives animation from JavaScript, so a dropped frame
>   is a dropped frame. Prefer CSS transitions on `transform` and `opacity`, which
>   the compositor owns, over anything that runs per frame in JS.
> - Hover-triggered motion is gated behind
>   `@media (hover: hover) and (pointer: fine)` and is never the only indication
>   of state.
> - `prefers-reduced-motion` is honoured by the WebView and must be respected —
>   gentler, not instant, exactly as the shared rule says. Test it: on Windows it
>   follows the "Show animations" system setting, which more users have off than
>   you would expect.
> - Haptics do not exist. `expo-haptics` no-ops on web, so anywhere the mobile
>   app pairs a haptic with a visual, the desktop has only the visual — check
>   that it still reads as confirmation on its own.
> - Window-level motion belongs to the OS. Do not animate window open, close,
>   resize or minimise; do not animate the tray icon.
> - Feel is judged in a **release build of the shell**, on the slowest supported
>   machine, on each OS the release targets. A dev server in a browser tab is not
>   that, and neither is a Chromium tab standing in for WebKitGTK.

---

## 9. The plan

Six phases plus a deferred seventh. Each is independently shippable, names its
rollback point, and carries an effort band for one engineer: **S** under a week,
**M** one to two weeks, **L** two to four weeks.

Per §17 and §18, every phase that touches an interface runs `/ui-ux-pro-max`
before building and `/find-animation-opportunities` before animating. Per §10,
each phase files a note under `changelog/2026/…`.

### Phase 0 — Make the web target real again (S) — **DONE 2026-09-05**

Bump `react-native-web` to `~0.21.0` to match `expo/bundledNativeModules.json`.
Resolve the `lightningcss` contradiction between `apps/canvas/package.json:64`
and the root `package.json:41,45`. Verify the web target builds and renders, and
run the viewport spike before committing to Phase 3.

**Shipped.** `react-native-web` resolved to `0.21.2`, whose peer range is
`react ^18.0.0 || ^19.0.0` — the conflict with the installed `react@19.2.3` is
gone. `lightningcss` in `apps/canvas` was aligned *down* to `1.29.2` to match
what the root `resolutions`/`overrides` already forced and what the lockfile
already resolved, so the manifest stops disagreeing with reality; the root pin
itself was left alone because it arrived in the initial scaffold (`70e1dc1`) with
no recorded reason, and Phase 0's value is a two-line rollback.

**Evidence.** `bun run typecheck` 5/5. `bun run test` 0 fail (canvas 30,
conductor 49, config 18, protocol green). `bun run lint` 17 errors — **identical
to the pre-change baseline**, all of them the documented Windows CRLF issue.
`bun run check:size` clean. `expo export --platform web` succeeds and the app
renders with zero console errors. Breakpoints verified by measurement, §5 above.

**Not verified:** no Android build was run, so the claim that this introduces no
Android regression is untested. `react-native-web` is not in the native
dependency graph, so the risk is low — but low is not zero, and it has not been
measured.

**Rollback:** revert the two dependency lines and re-run `bun install`.
**Debt watch:** none. No source file was touched; the spike was reverted.

### Phase 1 — The shell, wrapping the existing bundle (M)

Create `apps/easel` — a Tauri v2 crate, a `tauri.conf.json`, and a build script
that runs the Expo web export and points the shell at `apps/canvas/dist`. No
product changes. Add a Rust/`cargo` check to `bun run doctor` alongside the
existing Bun, Node, JDK and Android SDK checks.

**Ships:** an installable, unsigned build on one OS that does everything the web
build does.
**Rollback:** delete `apps/easel` and its workspace entry. `apps/canvas` is
untouched.
**Debt watch:** `scripts/doctor.ts` is 265 lines. A toolchain check has roughly
35 lines of headroom before §12 bites; if it needs more, add
`scripts/doctor-rust.ts` beside it rather than growing the file.

### Phase 2 — Pairing without a camera (M)

Add the payload copy row to `apps/conductor/src/pairing/page.ts`. Register
`eidolon://` in the shell, add single-instance forwarding, and add
`apps/canvas/store/deep-link.ts` subscribed from `app/_layout.tsx`. Build
`app/(auth)/pairing.web.tsx` around paste-a-link with the existing manual form as
the fallback, extracting the shared pieces into `components/pairing/`.

**Ships:** a desktop build that pairs, holds the socket, and survives a restart.
**Rollback:** the conductor row is additive and independently revertible; the
desktop keeps the manual form, which needs no protocol handler.
**Debt watch:** `apps/canvas/app/(auth)/pairing.tsx` is 225 lines and is **not**
in the debt table, so it is held to 300 — do not add a desktop branch inside it.
`apps/conductor/src/pairing/page.ts` is 262; the copy row must fit in 38 lines.
`store/connection.ts` is 264 and must not absorb the deep-link handler.

### Phase 3 — Desktop layout (L)

Split `components/theme/ThemeStudioSheet.tsx` by responsibility first, then build
the desktop composition. Add `lib/breakpoints.ts` and the breakpoint values in
`@eidolon/config`. Replace `SafeAreaView`'s zero insets with real window padding
from `@eidolon/tokens`. Build the chat surface responsive from the start, since
`app/(main)/chat/[id].tsx` is still a placeholder.

**Ships:** an app that looks deliberate in a 1600 px window instead of a stretched
phone.
**Rollback:** the split is behaviour-preserving and ships on its own; the desktop
composition is additive `.web.tsx` files that can be deleted without touching the
mobile path.
**Debt watch:** this is the phase that would break §12 if done carelessly.
`ThemeStudioSheet.tsx` is at **731 against a recorded 736** — five lines. Split
before adapting. `apps/canvas/app/(main)/demo.tsx` is at **886 against a recorded
886** — zero headroom; it cannot absorb a single line. `store/theme-store.ts` is
at **317 against 317** — a window-state slice goes in a new file.
`services/font-registry.ts` is at **308 against 308** — desktop font caching goes
in a new module.

### Phase 4 — Shipping a signed binary (M)

Certificates, notarisation, installer formats, and the updater manifest. Extend
`scripts/release.ts` to publish desktop artefacts alongside the APK, keeping
`expo.version` from `apps/canvas/app.json:6` as the single source of the version.

**Ships:** a downloadable, installable release for the chosen OSes.
**Rollback:** unsigned artefacts still install with a warning; the release script
change is additive and the APK path is unaffected.
**Debt watch:** `scripts/release.ts` — check its length before adding to it.
**Blocked on:** the signing decision below.

### Phase 5 — OS integrations (M)

Window-state persistence, tray reflecting the four connection states already
computed at `app/(main)/index.tsx:25-30`, native notifications, one global
shortcut. Multi-window last, or not at all.

**Ships:** each integration independently. None depends on another.
**Rollback:** each is a separate plugin registration and a separate revert.
**Debt watch:** the tray state mapping is shared with the connection pill —
extract it to `store/connection-status.ts` rather than duplicating it or growing
`app/(main)/index.tsx`.

### Phase 6 — Host mode (deferred; decision point)

Only if the user chooses it. Preconditions, all currently unmet:

- `apps/conductor` acquires a real build step. It has none
  (`apps/conductor/package.json:5-9`).
- A Bun runtime is shipped per platform as a sidecar, because of `bun:sqlite`
  (`apps/conductor/src/db/index.ts:1`) and `hono/bun`
  (`apps/conductor/src/ws/index.ts:3`).
- `EIDOLON_DATA_DIR` gains a single-writer lock, so a supervised conductor and a
  hand-started one cannot both open the LanceDB directory.
- The `@lancedb/lancedb` optional-dependency pruning from
  `apps/conductor/Dockerfile:14-19` is reproduced per installer.

**Rollback:** Host mode is a toggle. Off returns the app to a plain client
pointing at whatever host it was already paired with.

---

## Decision points

These are the user's calls. The plan does not assume an answer to any of them.

**1. Which OS ships first.** Windows has the largest audience and the least
friction to build here — the repository already runs on Windows 11 and
`scripts/doctor.ts:27` branches on it. macOS costs a paid developer account
before anything is installable at all. Linux is cheapest to sign and hardest to
test across desktop environments.

**2. Paying for code signing.** macOS is effectively all-or-nothing: without a
Developer ID and notarisation, Gatekeeper refuses to open the app. Windows is a
spectrum — unsigned works but shows a SmartScreen warning, OV builds reputation
slowly, EV starts with it and costs more. Shipping Linux-first avoids the
question entirely for a while.

**3. Windows WebView2 runtime.** The evergreen bootstrapper keeps the installer
small but needs a network connection on first run and assumes a reasonably
current Windows. The fixed-version runtime works offline and on older machines at
roughly +130 MB. This is the "older hardware" call.

**4. AppImage on Linux.** It registers no URI scheme, so pairing there is
paste-only. Worth shipping anyway for portability, or worth skipping to keep one
documented pairing flow?

**5. Host mode (Phase 6).** Whether the desktop app should ever supervise a local
conductor. The recommendation is no for v1 and a deliberate decision later, not a
drift into it.

**6. The workspace name.** `apps/easel` is proposed to sit beside `canvas` and
`conductor`. Rename freely; nothing depends on it.

---

## Follow-ups

Found while reading, out of scope here, unfixed:

- **`apps/canvas/src/` is a dead re-export shim.**
  `apps/canvas/src/services/font-registry.ts` and
  `apps/canvas/src/store/connection.ts` are one line each, re-exporting
  `../../services/font-registry` and `../../store/connection`. Nothing imports
  either, but `apps/canvas/tsconfig.json:11` typechecks them.
- **Four `@rn-primitives/*` dependencies are unused**
  (`apps/canvas/package.json:23-26`), and `@rn-primitives/dialog` declares a peer,
  `@rn-primitives/portal`, that is not installed.
- **`react-native-reanimated` is a dependency no source file imports**, while
  RULES.md §18 mandates it for all motion. Either motion has not been built yet
  or the rule and the code have diverged.
- **The §12 debt table disagrees with the checker.** RULES.md §12 records
  `ThemeStudioSheet.tsx` at 865 and `store/theme-store.ts` at 420;
  `scripts/check-file-size.ts:25-26` records 736 and 317, and the files are
  actually 731 and 317. `store/connection.ts` is recorded at 336 in both and is
  actually 264, so it no longer appears in `bun run check:size:all` output at all.
- **`lightningcss` is pinned to two different versions** — `1.29.2` in the root
  `resolutions` and `overrides` (`package.json:41,45`) and `1.30.1` in
  `apps/canvas/package.json:64`.
- **`typescript` is `~6.0.3` in `apps/canvas` and `^5.7.3` everywhere else.**
- **Comments exist in files RULES.md §16 forbids them in** — for example
  `apps/canvas/store/storage.ts:58,73,92,101-102,109` and
  `apps/canvas/store/connection.ts:10,19,41,52`. Pre-existing; noted because
  desktop work will touch both files.
- **On-disk font caching is lost on the web target.**
  `services/font-registry.ts:273-279` skips caching when there is no document
  directory, so every desktop launch re-fetches from the CDN. A desktop shell can
  provide a real cache directory; that is a Phase 3 or later improvement, not a
  blocker.

---

## Related

- [docs/PAIRING.md](./PAIRING.md) — the pairing flow this extends
- [docs/BUILD_ANDROID.md](./BUILD_ANDROID.md) — the size and signing work desktop
  should learn from
- [docs/THEMING.md](./THEMING.md) — the theme engine that has to survive the port
- [RULES.md](../RULES.md), [LLM_STATE.md](../LLM_STATE.md)
