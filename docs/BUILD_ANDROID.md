# Building the Android APK

## Prerequisites

```bash
bun run doctor
```

This must report no `FAIL` lines. It checks Bun, Node, a JDK 17+, the Android
SDK, and — importantly — the **NDK and CMake**, which this app genuinely needs
because Reanimated, Nitro Modules (MMKV), react-native-screens and worklets all
compile native code from source. A missing NDK surfaces as a confusing CMake
error deep in the Gradle log, so the doctor checks for it up front and installs
it via `sdkmanager` when it can.

## Build

```bash
bun run build:apk
```

Output: `apps/canvas/android/app/build/outputs/apk/release/app-release.apk`

The script runs `expo prebuild` and then `gradlew app:assembleRelease`. Prebuild
**regenerates `apps/canvas/android/` from scratch every time** — that directory
is gitignored and must be treated as build output. Anything you need to persist
there belongs in the config plugin (below), not in the generated files.

For a Play Store bundle instead: `bun --cwd apps/canvas build:aab`.

## What the config plugin does

`apps/canvas/plugins/with-android-build-optimizations.js` reapplies three things
on every prebuild.

**1. One ABI instead of four.** The default ships `armeabi-v7a`, `arm64-v8a`,
`x86` and `x86_64` in a single universal APK — four copies of every native
library. Restricted to `arm64-v8a`, which covers every 64-bit Android device and
is what Google Play requires.

> The APK will **not install on an x86 emulator**. Add `x86_64` to
> `GRADLE_PROPERTIES` in the plugin if you need emulator installs (~+28 MB).

**2. R8 and resource shrinking.** Both default to `false` in the React Native
template. Enabled here, with keep rules for the libraries in this app that
resolve classes reflectively (Expo modules, TurboModules, Nitro/MMKV, Reanimated,
Gesture Handler).

**3. A short CMake staging path.** Native modules resolve under
`node_modules/.bun/<pkg>@<version>+<hash>/node_modules/<pkg>/`, and AGP puts its
CMake tree beneath that. The deepest generated path lands at exactly 260
characters — and the `ninja` bundled with CMake 3.22.1 stats via the ANSI Win32
API, which caps at 260 **regardless of the `LongPathsEnabled` registry setting**.
The stat fails, ninja decides the build manifest is stale, re-runs CMake, and
loops until it gives up:

```
ninja: error: manifest 'build.ninja' still dirty after 100 tries
```

The plugin relocates CMake staging to `.native-build/` at the repo root, which
removes ~90 characters. If you hit that error anyway, that path is the first
thing to check.

## Size

The current configuration produces **~43 MB**, down from 136.5 MB.

| Change | Before | After | Delta |
|---|---|---|---|
| ABI restricted to `arm64-v8a` | 103.9 MB native libs | 27.2 MB | −76.7 MB |
| R8 minification | 17.0 MB dex | 7.3 MB | −9.7 MB |
| Per-icon imports (see below) | 10.18 MB bundle | 3.97 MB | −6.2 MB |
| Resource shrinking | 1.66 MB arsc | 1.44 MB | −0.2 MB |
| **Total** | **136.5 MB** | **42.9 MB** | **−93.6 MB** |

### Icons: never import the barrel

`@hugeicons/core-free-icons` resolves its entry to a CJS barrel re-exporting all
6031 icons, and **Metro does not tree-shake**. Importing from it shipped every
icon regardless of how few were used.

Import from `apps/canvas/lib/icons.ts` instead, which re-exports only what the
app uses via the package's `./*` subpath exports:

```ts
import { Cancel01Icon } from "@/lib/icons";        // correct
import { Cancel01Icon } from "@hugeicons/core-free-icons"; // ships all 6031
```

To add an icon, add a line to `lib/icons.ts`.

### Further levers, not applied

- Native libs and the Hermes bundle are stored **uncompressed**
  (`expo.useLegacyPackaging=false`). Enabling legacy packaging would cut roughly
  another 15 MB of download at the cost of a larger on-device install.
- `libbarhopper_v3.so` plus the ML Kit models (~5.5 MB) are ML Kit barcode
  scanning, required by QR pairing. They stay.

## Releasing

```bash
bun run release            # build, package, publish
bun run release --dry-run  # everything except creating the release
bun run release --skip-build   # publish an APK already built
```

The APK is copied to `dist/eidolon-v<version>.apk`. The version comes from
`expo.version` in `apps/canvas/app.json` — the value users see — not from any
`package.json`. The `## [<version>]` section of `CHANGELOG.md` becomes the
release notes, so **that section must exist or the script stops**.

It refuses to publish when the working tree is dirty, when the tag already
exists, when `gh` is not authenticated, or when there is no `origin` remote. Each
case prints the specific command that fixes it.

Releases publish to <https://github.com/AbdulWadudh/eidolon/releases>.

`expo.version` and `android.versionCode` are bumped automatically — patch by
default, or `--minor` / `--major` / `--version 2.3.0`. Release notes are
generated from the commits since the previous tag, grouped by conventional-commit
type; writing them by hand is optional and only needed if you want something
other than the commit subjects, in which case put it under `## [Unreleased]` in
`CHANGELOG.md` and that wins.

## Signing

Release builds are currently signed with the **debug keystore** — fine for
sideloading, not for distribution. Generate a release keystore and configure it
before shipping anywhere real.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `manifest 'build.ninja' still dirty after 100 tries` | Windows path length — see above |
| CMake errors about a missing compiler | NDK not installed; `bun run doctor` |
| Settings reverted after a build | edited generated `android/` instead of the plugin |
| APK won't install on an emulator | `arm64-v8a` only by design |
