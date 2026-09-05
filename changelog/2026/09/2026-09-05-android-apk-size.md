# Android APK: 136.5 MB to 42.9 MB

**Date:** 2026-09-05
**Scope:** apps/canvas

## What changed

`apps/canvas/plugins/with-android-build-optimizations.js` — a config plugin,
because `expo prebuild` regenerates `android/` on every build and anything
written there directly is lost.

| Change | Before | After | Delta |
|---|---|---|---|
| ABI restricted to `arm64-v8a` | 103.9 MB libs | 27.2 MB | −76.7 MB |
| R8 minification | 17.0 MB dex | 7.3 MB | −9.7 MB |
| Per-icon imports | 10.18 MB bundle | 3.97 MB | −6.2 MB |
| Resource shrinking | 1.66 MB arsc | 1.44 MB | −0.2 MB |
| **APK** | **136.5 MB** | **42.9 MB** | **−93.6 MB** |

## Why

**Four ABIs in one universal APK.** x86 and x86_64 are emulator-only and were
58 MB of the total. Cost: the APK no longer installs on an x86 emulator.

**R8 and resource shrinking both default to `false`** in the React Native
template. Enabled with keep rules for the libraries here that resolve
reflectively.

**The icon barrel.** The app imports 15 icons; the bundle contained all **6031**.
`@hugeicons/core-free-icons` resolves to a CJS barrel and Metro does not
tree-shake. Confirmed by probing the built Hermes bundle for icon names the app
never references — `Dna01Icon` and `BiscuitIcon` were both present before,
absent after.

## Evidence

Measured from the APKs themselves by summing zip entry sizes per group, not
estimated. Final artifact confirmed with `ls -lh`: 43M / 44,978,178 bytes.

## Obstacle worth recording

A fresh CMake configure failed with `ninja: error: manifest 'build.ninja' still
dirty after 100 tries`. The prefab CMake config path, referenced un-normalised
through `arm64-v8a/../prefab/...`, measures **exactly 260 characters** under
bun's `.bun/<pkg>@<version>+<hash>/` layout, and ninja 1.10.2 (bundled with the
only installed CMake, 3.22.1) stats via the ANSI Win32 API — capped at 260
**regardless of `LongPathsEnabled=1`**. The stat fails, ninja re-runs CMake,
loops, gives up.

`subst` does not help: bun's junctions are absolute, so Gradle fails with
"different roots". Fixed by relocating CMake staging to `.native-build/` at the
repo root via a `settings.gradle` `beforeProject` hook — setting
`buildStagingDirectory` from the root project is too late and AGP throws.

## Follow-ups

- `expo.useLegacyPackaging=false` keeps libs and the Hermes bundle uncompressed;
  flipping it saves ~15 MB of download at the cost of install size.
- Release builds are signed with the **debug keystore**.
