# The white bar at the top, and screens that stop lying while they load

**Date:** 2026-09-06
**Scope:** apps/canvas

## What changed

**The Android status bar was a white strip with invisible contents.** The clock
and the icons were there; they were white on white.

`android:statusBarColor` was already transparent, so whatever sits behind it
shows through — and that was the launch theme's window background,
`splashscreen_background`, which prebuild had generated as `#FFFFFF`. The
`splash.backgroundColor` in app.json never reached it, because `expo-splash-screen`
is not installed and nothing else owned that colour.

`plugins/with-dark-system-chrome.js` owns it now: the splash background and the
window background are the app's canvas colour, `windowLightStatusBar` is false
so the system draws its icons light, and the navigation bar is transparent to
match. It is a plugin rather than an edit to `android/` because that directory is
gitignored and regenerated on every build.

The same white is what flashed before the first frame, so that is gone too.

**Two screens told the reader something untrue while they loaded.** The roster
showed "Nobody here yet" until the fetch returned and then replaced it with a
full list; the chat showed the empty stage, inviting the reader to start a
conversation they had already had, until the transcript arrived. Both now show a
placeholder shaped like what they are about to become.

**The count badge sat above the middle of its pill.** Dropping Android's extra
font padding was not enough on its own — the font still reserves the space under
the baseline that a descender would use, and a digit has none, so the glyph
rides high. The text's line box is the pill's height now and the glyphs centre
in it, whatever the font's metrics say.

## Why

The status bar was worth chasing to the generated file rather than patching at
runtime. `expo-status-bar` no longer takes a `backgroundColor` — it was removed
once Android went edge-to-edge — so the only honest fix is the one that lands
before React does. Setting it at runtime would also have left the launch flash.

## Evidence

`bunx expo prebuild --platform android --no-install`, then the generated files:

```
colors.xml   splashscreen_background  #FFFFFF -> #0D0E11
             activityBackground       #0D0E11  (added)
styles.xml   android:windowBackground @color/activityBackground
             android:windowLightStatusBar false
             android:navigationBarColor @android:color/transparent
```

Suites: conductor 398, canvas 156, config 38, protocol 25 — 617 pass, 0 fail.
Lint, typecheck and `check:size` green.

## Follow-ups

- **The status bar fix needs a new APK.** It is a native resource, so the
  installed build cannot pick it up from a reload.
- Prebuild reports `userInterfaceStyle: Install expo-system-ui in your project
  to enable this feature`, so the `dark` setting in app.json is being ignored.
  Nothing depends on it today, but it is a dependency away from working.
- The skeletons are shaped like their screens but do not match a specific
  character's card, so a long name still reflows on arrival.
