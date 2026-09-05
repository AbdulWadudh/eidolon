# Changelog

Notable changes per release. Each `## [version]` section becomes the release
notes for the matching GitHub release, so keep the heading format intact —
`scripts/release.ts` parses it.

Write new work under **`## [Unreleased]`**. `bun run release` bumps
`expo.version`, promotes that section under the new version with today's date,
and publishes it as the GitHub release notes.

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-09-05

### Added

- **Theme Studio and Theme & Font Lab.** Collapsible accordion sections,
  collapsed by default so the live preview stays on screen while editing. Every
  token has a reset that restores the factory value for the active mode, or drops
  a character override so it inherits from global again.
- **Google Fonts browser.** Searchable across the full catalogue, fetched once
  and cached for 7 days so typing never hits the network. Installed families are
  re-registered on launch. Previews load lazily for on-screen rows only, capped
  at 3 concurrent and 80 per session; CJK families are skipped because they run
  5–20 MB per face.
- **Separate dialogue and interface fonts.** `fontMain` and `fontUI` are both
  editable; `-Bold`, `-Italic` and `-Medium` faces are derived from them.
- **Text size control.** `fontScale` multiplies the type scale.
- **Authenticated pairing.** `GET /api/pair/verify` confirms a token before the
  client stores it, and the client holds a real WebSocket with backoff reconnect.
- **Browser-rendered pairing QR** at `GET /api/pairing/qr`.
- **`bun run doctor`** — toolchain preflight that installs what is safe to
  install and reports the exact fix for what is not.

### Changed

- **Android APK: 136.5 MB → 42.9 MB.** One ABI instead of four (−76.7 MB), R8
  and resource shrinking (−9.9 MB), and per-icon imports instead of the
  `@hugeicons/core-free-icons` barrel, which Metro cannot tree-shake (−6.2 MB).
- Theme variables publish through `VariableContextProvider` rather than the
  deprecated `vars()`, which only propagated when render guards happened to fire.
- Appearance mode is an inline segmented toggle rather than a collapsible section.

### Fixed

- **Theme edits appearing late.** Editing one variable did nothing until an
  unrelated one was changed, which then applied both.
- **Theme Studio lag.** Hex fields wrote to the store on every keystroke,
  pushing invalid intermediate colours and re-rendering the whole screen; the
  radius slider emitted on every touch frame; MMKV persisted synchronously
  inside every state update.
- **The colour picker fighting the finger.** Gesture output was fed back through
  the picker's `value`, restarting a 200 ms animation each frame.
- **Stale colour in the picker**, which opened on the previously edited token.
- Bold and italic text ignoring a font change — those variables were never
  published, so they always resolved to the stylesheet defaults.
- Text clipped in hex inputs on Android (fixed-height fields plus font padding).
- Fonts failing to install on web, and `.otf` families such as Noto Sans JP
  failing everywhere because the file extension was assumed to be `.ttf`.
- The connection pill showing green regardless of the actual socket state.
- Better Auth warning about an unset base URL.

### Known issues

- `react-native-css` 3.0.7 caches computed styles per rule set, so a descendant
  can hold a stale variable. Preview blocks work around it with a remount key;
  3.0.7 is the latest release, so there is nothing to upgrade to.
- Arbitrary text sizes (`text-[10px]`, `text-[11px]`) do not follow `fontScale`.
- Release APKs are signed with the debug keystore — fine for sideloading, not
  for distribution.
- `PAIRING_SECRET` defaults to a development placeholder and is the only thing
  gating the WebSocket.
