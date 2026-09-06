# Changelog

Notable changes per release. Each `## [version]` section becomes the release
notes for the matching GitHub release, so keep the heading format intact —
`scripts/release.ts` parses it.

Write new work under **`## [Unreleased]`**. `bun run release` bumps
`expo.version`, promotes that section under the new version with today's date,
and publishes it as the GitHub release notes.

## [Unreleased]

### Changed

- **Breaking:** every API route now lives under `/api/v1/`. The unversioned
  paths are gone. `GET /health` is additionally served unversioned for container
  health checks and uptime monitors.
- **Breaking:** `PAIRING_SECRET` has no default. Unset or blank means the
  conductor refuses every token and every socket upgrade.

- Conductor databases now live outside the repository, under
  `%LOCALAPPDATA%\eidolon\data` on Windows and `~/.eidolon/data` elsewhere, so a
  reclone or `git clean` no longer destroys characters, messages and memories.
  `GET /health` reports the resolved location.

### Added

- `@eidolon/config`, the single source for every configurable value — ports,
  hosts, route paths, timeouts, limits, TTLs and storage prefixes. Isomorphic
  entry point for shared values, `@eidolon/config/server` for anything reading
  the environment or the filesystem.
- S3-compatible object storage for character images and voice notes, served for
  anonymous read so the mobile app streams media directly. The bucket and its
  public read policy are ensured on boot, and `GET /health` reports storage
  connectivity. Endpoint, bucket and credentials come from `S3_*` environment
  variables — no host is baked into the source.
- Docker image for the conductor and a Coolify deployment stack
  (`docker-compose.yaml`), with SQLite and LanceDB on a named volume so a
  redeploy keeps every character, message and memory. `EIDOLON_DATA_DIR` points
  the databases at that volume.
- Local development storage: `bun run storage:up` brings up an S3-compatible
  server and prints the settings to paste into `apps/conductor/.env`.
- **Roleplay chat.** The chat screen streams a reply token by token behind a
  trailing amber quill bead, renders dialogue and `*stage directions*` in
  distinct faces, and virtualises the transcript so long threads stay smooth.
- **Reply suggestions in character.** Three options written as short
  first-person lines that stay inside two sentences. Tap one to send it,
  long-press to drop it into the input and edit the words first, or reroll for a
  fresh set.
- **The ⚡ button asks for them.** Suggestions are generated when you tap the
  lightning icon in the tool bar, not on every reply. The icon fills while the
  options are showing and tapping it again puts them away, so a turn you meant
  to type costs no extra model calls.
- **Photos.** Ask for one from the tool bar and she sends it back, generated
  locally. The button opens a sheet that asks how it should be framed and what
  it should be of, with ideas drawn from the conversation. Not only selfies —
  wide shots of where she is, someone else in frame, the dog, the view. The
  first request builds her face and keeps it, so every later photo is
  recognisably the same person. About five seconds once warm, with a live
  progress bar while it paints.
- **Photos you can do something with.** Tap to open full screen, pinch to zoom.
  Set one as her profile picture — dragging and pinching to choose which part of
  it to use — or as the chat background, regenerate it, or delete it. Tapping her
  profile picture opens it full screen.
- **`bun run stack:up`.** Starts the language model, voice, image server and
  conductor, and waits for each to answer before moving on. `stack:status`
  prints what is up.
- **Voice note tabs.** A `▶ 4"` chip riding above any message that carries
  audio, merged into the bubble, swapping the play arrow for a moving waveform
  while it plays.
- **Scroll that follows the reader.** A new turn settles near the top with the
  previous message still peeking above it, streaming only follows the live edge
  while you are already there, and a "Jump to latest" pill brings you back.
- **Input dock.** Stage-direction placeholder, amber caret, a send button that
  becomes a stop button mid-reply, and a tool bar for mood, selfies, voice,
  lorebook and quick actions.

- **Conversations survive a reload.** Reopening a chat restores the transcript
  and the character's mood and affinity from the conductor.
- **Reset a character.** A "More actions" sheet behind the `+` button wipes the
  conversation and puts the relationship back to the start.
- **Nudge her mid-message.** `<be more shy>` in a message steers how she behaves
  without being something you said out loud. She never answers it directly and
  may take her time about it.
- **Voice notes play as they arrive** and keep playing while you scroll, one at
  a time.

### Fixed

- A release build can reach a conductor on your own network again.
- Pairing is remembered between launches instead of asking for the QR code
  every time.
- The keyboard no longer covers the message box while you type, and the
  newest message stays in view when it opens.
- Replies stay short instead of turning into a short story.
- The transcript follows a reply as it is written, and leaves you alone if you
  have scrolled up to read something earlier.
- Reply options are no longer three fixed lines of filler.
- The offline reply fallback no longer doubles every space.

## [1.0.1] - 2026-09-05

### Added

- Per-mode theme palettes, font system, and authenticated pairing (edde280)
- Scaffold canvas app with Expo router, themed UI components, and OTA font registry (70e1dc1)
- Initialize conductor service with authentication, database, and resilient JSON parsing support (96b3528)
- Initialize project structure with typed protocol schemas and message validation tests (8978d23)

### Documentation

- Correct the release instructions now that the remote exists (6d2fa36)
- Forbid AI co-author trailers on commits (34f8010)
- Project documentation, agent guides, and release tooling (dddfc76)

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
