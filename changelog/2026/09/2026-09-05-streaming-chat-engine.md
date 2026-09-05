# Streaming chat engine and roleplay surface

**Date:** 2026-09-05
**Scope:** apps/canvas, apps/conductor, packages/config, scripts

## What changed

The chat screen at `app/(main)/chat/[id].tsx` stopped being a route shell and
became the roleplay surface: a virtualised feed of solid message cards, live
token streaming with a trailing amber bead, an editable three-option reply tray,
and a bottom input dock with a stage-direction placeholder and tool bar.

Underneath it:

- `services/websocket.ts` is now the single owner of the conductor socket —
  connect, exponential backoff, a 30s heartbeat, and typed fan-out of
  `ServerMessage` to any number of subscribers. It exports `useConductorSocket()`.
- `store/connection.ts` no longer opens a socket of its own. It configures the
  service and reflects its status, which took the file from 336 lines to 205 and
  retired its `KNOWN_DEBT` entry.
- `store/chat-store.ts` holds the turn: messages, streaming buffer, status,
  suggestions and draft text. Pure helpers live in `store/chat-messages.ts`.
- `lib/roleplay.ts` parses `*stage directions*` and `(actions)` out of raw model
  text into typed segments.
- `packages/config` gained `SOCKET`, `CHAT`, `CHAT_MS`, `EASING_BEZIER` and
  `PRESS_SCALE`, and `RECONNECT_DELAYS_MS` lost its 30s tail.

## Why

**One socket, not two.** `connection.ts` already owned a `WebSocket` with its own
backoff. Adding a second client for chat would have meant two upgrades against
the same conductor, two heartbeats, and every `text_delta` delivered twice —
billed twice by the LLM and rendered twice. The socket moved out of the store
instead, which is where the dangling comment at the foot of `connection-api.ts`
said it belonged.

**End of turn is `status_update: idle`.** The protocol has no `turn_complete`
event. The conductor emits `reply_suggestions`, then `mind_update`, then
`status_update: idle`, so idle is what commits `streamingText` into a permanent
message. The heartbeat complicates this: `ping` is answered with
`status_update: idle` carrying `detail: "pong"`, which is indistinguishable from
an end-of-turn unless the detail is checked. A heartbeat landing mid-stream would
otherwise have committed half a sentence and left the rest orphaned. The detail
check is the only thing preventing that, and `chat.test.ts` pins it.

**`expo-av` was rejected.** The brief asked for it, but SDK 57's
`bundledNativeModules.json` ships `expo-audio ~57.0.4` and does not list
`expo-av` at all; the newest `expo-av` (16.0.8) targets the SDK 53-era
`expo-modules-core` and carries its own CMake/C++ build. That second point
matters more than the first here — trap 5 in `LLM_STATE.md` is a 260-character
CMake path failure on this exact toolchain, and adding another native C++ module
re-opens it. `expo-audio` is the maintained successor with the same surface
(`useAudioPlayer` / `useAudioPlayerStatus` in place of `Audio.Sound`), so
`hooks/use-audio-note.ts` wraps it and is the only file that would change if the
decision is reversed.

**FlashList v2 has no `estimatedItemSize`.** The brief asked for `120`. v2
removed the prop — sizing is automatic — so the request has no target. What
replaces it is better suited to chat anyway: `maintainVisibleContentPosition`
with `autoscrollToBottomThreshold` and `startRenderingFromBottom`.

**Scroll follows the reader, not the stream.** The first cut scrolled to the end
on every new message. shadcn's `message-scroller` notes name that as the central
mistake: auto-scroll must never be the default, or a reader looking at earlier
context gets yanked to the bottom every time a token lands. The feed now anchors
a *new user turn* near the top with `scrollPreviousItemPeekPx` of the previous
message still visible, follows the live edge only while the reader is already at
it, and offers a "Jump to latest" pill otherwise.

**Motion is one node per effect.** Streaming text arrives ~20 tokens/second, and
the animation gate forbids animating anything at that frequency. The fade is
therefore scoped to a single trailing `<Text>` — `splitTrailingWord` separates
the newest word from the settled prefix — rather than one animated node per
token. The bead, the waveform and the shimmer are Reanimated CSS keyframes on
`opacity`/`transform` only, running on the UI thread, and every one of them is
gated behind `useReducedMotion`.

**A conductor bug surfaced during verification.** The offline LLM fallback
yielded `` `${token} ` `` while `MOCK_FALLBACK_TOKENS` already carried leading
spaces, so every fallback reply rendered with doubled spaces
(`"*looks  up  softly*"`). Fixed to `yield token`.

## Evidence

- `bun run typecheck` — 5 packages, zero errors. `tsc --listFiles` confirms every
  new component, the store, the socket service and the `expo-audio` /
  `flash-list` type entries are in the program.
- `bun run test` — canvas 49 pass / 0 fail, up from 30. `apps/canvas` had no `test`
  script, so its suites were never reached by `turbo run test`; it has one now.
- `bun run check:size` — no new file over 300 lines; `connection.ts` 336 → 205
  and removed from `KNOWN_DEBT`.
- Biome is clean across all 40 new and touched files.
- Live socket run against a local conductor (LLM offline, mock fallback):
  connect → `chat_turn` → 16 `text_delta` → `reply_suggestions` → `mind_update`
  → `status_update: idle`, committed as one assistant message with a `9:40 PM`
  style timestamp; then reroll returned a different triple, `selectSuggestion`
  filled the draft and collapsed the tray, and an edited second turn round-tripped.
- Rendered in Chromium at 412x915 against the same conductor: empty state, a
  streaming turn, the committed pair, the suggestion tray, tap-to-edit, reroll,
  and the `▶ 4"` audio tab (seeded, then reverted). Zero console errors.

## Follow-up pass, same day

Three changes after the first device look:

**The keyboard covered the input dock.** SDK 57 forces Android edge-to-edge, and
an edge-to-edge window does not resize for the IME — so RN's
`KeyboardAvoidingView` with `behavior="height"` had nothing to react to and the
dock stayed under the keyboard. Reanimated's own `useAnimatedKeyboard` is
deprecated in 4.5.1 and its migration note points at
`react-native-keyboard-controller`, which Expo SDK 57 already pins in
`bundledNativeModules.json` at 1.21.9. Added it, wrapped the tree in
`KeyboardProvider`, and swapped in its `KeyboardAvoidingView`
(`behavior="padding"`, `automaticOffset`). **This links native code — it needs a
fresh `expo prebuild` + build, not a JS reload.**

**The stage header was redundant.** The portrait, mood and affinity moved into
the top bar next to the back button, and `StageHeader.tsx` was deleted. That
returns roughly 90px of vertical space to the transcript on a 412x915 screen.

**The voice chip became a tab.** Reference screenshots showed the chip riding
*above* the bubble and merging into it, swapping a play triangle for an animated
waveform rather than showing both, and reading `4"` instead of `0:03`. The pill
moved out of the card into a sibling above it with a negative bottom margin, so
the card paints over its lower edge and the two read as one shape.
`formatVoiceDuration` renders `4"` under a minute and `1'15"` over.

## Second follow-up pass, same day

**Suggestions are generated, not hardcoded.** The conductor was emitting three
fixed strings ("Tell me more about that.") with no actions and no relation to
the scene. `services/suggestions.ts` now asks the model for three first-person
player replies as a JSON array, each capped at
`SUGGESTIONS.maxSentences` sentences and `SUGGESTIONS.maxChars` characters, each
required to open with a `*stage direction*`. `normalizeSuggestions` enforces all
of that after the fact — anything without an action is dropped, duplicates are
removed, and the set is backfilled from a nine-line pool so the protocol's
`length(3)` always holds.

The parse needs a guard that is not obvious. With the LLM offline the adapter
yields its mock prose, and `jsonrepair` will happily *repair* a sentence into an
array by treating a comma as a separator — which put the character's own line
("It seems my local brain is offline") into the player's reply options. So the
raw output is only parsed when it actually contains a bracketed array;
otherwise it goes straight to the fallback pool. `reroll` shuffles that pool, so
it visibly changes even with no model attached.

**The reply tray can be dismissed.** An `✕` beside Reroll sets a persisted
`areSuggestionsHidden` flag in MMKV, so the tray stops appearing on later turns
too. A compact `Show 3 replies` chip takes its place above the dock, which keeps
the choice reversible and discoverable instead of stranding the user in a state
they cannot undo.

**Tap sends, long press edits.** The original mapping was the other way round —
tap filled the draft, long press sent. Inverted on request: the common case
(take the suggestion as written) is now the cheap gesture, and editing is the
deliberate one. A light impact haptic fires on send and a selection haptic on
the edit press, each on the same frame as the visual.

## Theme audit, same day

Asked whether the chat surface actually honours the theme engine. Audited rather
than assumed, and it was two-thirds true.

**Colour was already clean.** Zero hex literals across all fourteen new
components; every colour comes from `useResolvedTheme(characterId)` or a
token-backed utility (`bg-card`, `border-border`, `text-text-primary`,
`bg-audio-pill`). `characterId` is threaded into all eleven `useResolvedTheme`
call sites, so per-character overrides reach every part of the screen.

**Type did not scale.** Nine call sites used arbitrary sizes — `text-[11px]`,
`text-[10px]`, `text-[15px]` — and Tailwind emits those as literal pixels.
`fontScale` only reaches the named steps, because `theme-css-vars.ts` publishes
it as `--text-xs` … `--text-2xl`. So the Text Size control moved nothing in the
chat. All nine now use the named steps. Fixed line heights (`leading-6`,
`leading-5`) had the same defect from the other direction: a 21px line box clips
a 22.4px glyph at 160%. They are ratios (`leading-normal`) now.

**Radius did not follow the token.** The audio tab drew its corners from a
constant in `@eidolon/config` while sitting flush against a `rounded-card`
bubble, so raising the theme radius split the two shapes apart. It reads
`theme.radius` now. The remaining decorative geometry — waveform bar width, bead
size, shimmer bar height — moved into `CHAT` so no component holds a magic
number, per §15.

Verified by writing a palette with a cyan accent, `radius: 22` and
`fontScale: 1.4` into storage and reloading: send button `rgb(34, 211, 238)`,
corner `22px`, input `19.6px` (14 × 1.4), and every card, chip, divider and label
followed. That surfaced one more defect — `Trusted Confidant · Affinity 76`
clipped to `Affinity …` in the top bar at 1.4×, which is the `dynamic-type` rule
("avoid truncation as text grows"). It wraps to a second line now.

Worth recording for the next person: on web, MMKV namespaces its keys as
`eidolon-canvas-store\<key>` in `localStorage`. A raw write to the bare key is
silently ignored, which looked exactly like a broken theme engine for a while.

## Follow-ups

- Long press to edit is covered by a unit test but **not verified as a gesture**.
  Long press timing and the two haptics need a device.
- The keyboard fix is **unverified**. `react-native-keyboard-controller` is a
  native module and the web target has no soft keyboard, so nothing here proves
  it on a handset. It needs an Android build and a look.
- No server message carries an audio URL. `audio_chunk` is handled — mp3 becomes
  a `data:` URI, `pcm_16000` yields a duration but no playable source — but the
  conductor never emits it, so **actual playback is unverified**. A protocol
  event carrying a RustFS URL is the missing half.
- The call button routes back to the chat; there is no voice route yet. The
  overflow menu opens `/demo` as a placeholder.
- The input toolbar buttons are wired to a no-op `onAction`.
- Nothing here has run on a physical device or emulator. Frame timing, keyboard
  behaviour and haptics are unmeasured; `KeyboardAvoidingView` in particular is
  only exercised by a desktop browser so far.
- `bun run lint` is green for the first time. It was failing on 17 pre-existing
  files, every one of them CRLF line endings rather than a real finding —
  `core.autocrlf=true` rewrites endings on checkout and Biome demands LF.
  `biome check --write` normalised them; `git diff --ignore-cr-at-eol` shows zero
  content change on all 17, and git stores LF in the index regardless. This will
  come back on a fresh clone until the repo gains a `.gitattributes`
  (`* text=auto eol=lf`). That one-line policy change is still worth making.

## Suggestions move behind the lightning button, 2026-09-06

The reply tray had two entry points and neither was cheap. It appeared on its
own after every turn, and once dismissed it left a `Show 3 replies` chip
floating above the dock. That chip is gone; the ⚡ in the input tool bar is the
control now.

**Tap once to ask, tap again to put away.** `ShowSuggestionsChip.tsx` was
deleted along with the `isShowSuggestionsChipVisible` selector. `InputToolbar`
gained a `suggestionsOpen` prop and its `ToolButton` an `active` state — a
`primary` tint at `22` alpha behind the glyph, the primary colour on the stroke,
and `strokeWidth` 2.4 against 1.8 — so the filled/off reading comes from the
theme rather than a second icon. `accessibilityState.selected` carries the same
fact to a screen reader.

**Nothing is generated until it is asked for.** `SUGGESTIONS.autoGenerate` is
`false`, and `ws/chat-turn.ts` only emits `reply_suggestions` when it is on:

```ts
const [audio, suggestions] = await Promise.all([
  synthesizeSpeech(reply, TTS.voice, signal),
  SUGGESTIONS.autoGenerate
    ? generateReplySuggestions(sceneTurns, { characterName: card.name, tier: card.tier }, signal)
    : Promise.resolve(null),
]);
```

That matters more than it looks. A suggestion set is three constrained
completions, and most turns are answered by typing — so the old behaviour paid
for three model calls on every reply that nobody read. Measured against the
local llama.cpp server, a turn now completes in **1143ms**; the suggestion set,
when requested, takes a further **1120ms** of its own. Roughly half the
end-to-end latency of a turn was being spent on options the reader never opened.

**`isTrayDismissed` became `isTrayOpen`.** The old flag was negative and the
default was "not dismissed", which made "closed by default" impossible to
express without a second flag. Reading positively, `revealSuggestions` sets
`isTrayOpen: true` and clears `areSuggestionsHidden`, `dismissSuggestions` sets
it false, and the reroll branch in `handleServerMessage` keeps the tray open
only when the reader is the one who asked:

```ts
isTrayOpen: state.isSuggestionsLoading ? state.isTrayOpen : false,
```

The screen generates on first open only — `toggleSuggestions` calls
`rerollSuggestions` when the list is empty and nothing is already in flight, so
re-opening the tray shows the set you last saw instead of burning three more
completions.

## Evidence

- Live run against the local conductor: turn done in 1143ms with
  `suggestions.length === 0` and the tray closed; tapping ⚡ set
  `isSuggestionsLoading` and `isTrayOpen` together and produced three distinct
  in-character options in 1120ms; tapping again hid the tray while keeping all
  three cached.
- `bun run lint` — 164 files, clean. `bun run typecheck` — 5 packages, clean.
- `bun run test` — 261 pass / 0 fail (protocol 25, config 33, canvas 68,
  conductor 135). `ws.test.ts` now asserts a plain turn emits **no**
  `reply_suggestions`, and that `regenerate_suggestions` does.
- `bun run check:size` — no new file over 300 lines.

## The ⚡ button was opening the wrong sheet

Tapping the lightning glyph opened the More actions sheet. The dispatch was
right — `if (action === "suggestions") toggleSuggestions()` — but the tap never
reached that button.

`ToolButton` carried `hitSlop={CHAT.minTouchTargetPx / 4}`, a 12px halo on a
32px button laid out with a 4px gap. Neighbouring hit rects therefore overlapped
by 20px, and `more` renders after `suggestions` in `RIGHT_TOOLS`, so it won
every contested point. Its rect reached 8px past the lightning icon's centre
while the glyph itself is 18px wide — **the entire right half of the visible
icon dispatched `more`.**

The halo now derives from the geometry instead of guessing at it:

```ts
const TOOL_SLOP = (CHAT.minTouchTargetPx - CHAT.toolButtonPx) / 2;
const TOOL_GAP = CHAT.minTouchTargetPx - CHAT.toolButtonPx;
```

With `toolButtonPx: 32` against a 44px target that is a 6px halo and a 12px gap,
so each button owns exactly one 44px band and adjacent bands meet without
crossing: `-6 → 38`, `38 → 82`, `82 → 126`.

That first landed at 48px and read as too airy. The floor in `RULES.md` is 44pt,
not 48, so the band came down to the rule's actual minimum. Density then runs
into arithmetic: the gap between two glyphs is `band - icon`, which is invariant
under how the 44px is split between button box and gap — shrinking the box just
moves the space around. The only lever left is the glyph, so `toolIconPx` is 20
rather than 18. Together that is 24px between icons, down from 30px, with the
touch target intact. Going tighter means breaking the 44pt rule.

Both groups plus the dock's `mx-4` and `p-2.5` come to 292px, so the row fits a
320px screen.

Worth generalising: `hitSlop` large enough to reach a 48px target is only safe
when the gap is at least as large as the slop on both sides. A slop bigger than
the gap silently hands taps to whichever sibling renders last, and it looks
exactly like a miswired handler.

## Voice notes survive a reopen, and stop replaying on entry

Two complaints, one cause. Reopening a chat played the last voice note again,
and no pill was visible on any message.

`GET /api/v1/characters/:id/messages` never carried audio, so `toMessage` in
`chat-api.ts` hardcoded `audioUrl: null` — every message rehydrated from the
server was mute, and the pill is gated on `message.audioUrl`. The audio existed
only as base64 inside a live `audio_chunk`, which is gone the moment the store is
rebuilt.

The autoplay was the same fact from the other side. `autoPlayMessageId` is set
when a reply commits with audio and **`clearAutoPlay` was never called by
anyone** — dead since it was written. Re-entering the screen remounts
`VoiceNotesProvider`, which resets its `autoPlayed` ref, sees a still-set token
and plays. `loadHistory` then replaced the messages with the mute server copies,
which is why the audio played with no pill anywhere on screen to pause it.

**The voice note is now a stored object.** `messages.audio_url` had been in the
schema since the first migration with nothing writing it, and `uploadAudio` /
`audioKey` were already sitting in `services/storage.ts`. `services/voice-notes.ts`
joins them: the mp3 goes to S3 under `audio/<character>/<messageId>.mp3`, the URL
lands on the row, and `getTranscript` returns it. `appendMessage` returns the new
row id so the upload has something to attach to.

`audio_chunk` gained an optional `url`, and the client prefers it over `data`.
When storage is up the base64 payload is not sent at all — **64KB of JSON over
the socket became 0** — and playback streams from RustFS instead. With no storage
configured the old base64 path still works, so a local run without S3 is
unaffected.

`VoiceNotesProvider` now takes `onAutoPlayed` and the screen passes
`chat.clearAutoPlay`, so the token is consumed by the play that uses it. A
remount finds nothing to autoplay. Live replies still speak on arrival, because
that path sets a fresh token each time.

## Toolbar spacing, second pass

44pt bands were still too airy. The gap is explicit now — `toolGapPx: 4` — with
the horizontal slop derived as half of it, which is what keeps neighbouring hit
rects from overlapping and is the whole content of the earlier misfire bug. The
44pt target is kept on the vertical axis, where there is no neighbour to collide
with: the buttons are 36×44 touch, 32×32 visual, 16px between glyphs, and the row
is 260px.

## Evidence

- Live turn against the local conductor and RustFS: `audio_chunk` arrived with
  `url=http://…/eidolon-media/audio/emma/<id>.mp3` and `base64Bytes=0`; the live
  message rendered a pill and set the autoplay token.
- Refetching the transcript — what reopening the chat does — returned the newest
  message *with* its `audioUrl`, and an anonymous `HEAD` on that URL returned
  `200 audio/mpeg 72620`.
- `bun run test` — 263 pass / 0 fail. Two new canvas tests cover preferring the
  hosted URL over inline base64, and clearing the autoplay token.
- Lint 165 files clean, typecheck clean, size gate clean.

## Still open

- Only messages generated after this change have audio. Older rows have a null
  `audio_url` and stay mute; nothing backfills them.
- `audioDuration` is still null for hosted notes, so the pill reads `0"` until
  playback starts and `expo-audio` reports the real duration. The TTS response
  does not carry a duration and it is not computed from the mp3.

## Pairing still did not survive a reload

The earlier fix moved the fallback store off `window.localStorage` and onto a
JSON file, which was the right idea and did not work. Two faults in one small
function, both silent:

`require("expo-file-system/next")` never resolved. The package publishes an
`exports` map with exactly two subpaths, `.` and `./legacy`; `next.ts` exists at
the package root but is not exported, and Metro honours `exports`. So
`openFallbackFile` threw, returned `null`, and the store fell through to the
`localStorage` branch — which does not exist in React Native. The fallback was
pure memory, exactly what the fix was meant to end.

And `File.text()` returns a **promise** on SDK 57. The synchronous reader is
`textSync()`. Had the import resolved, `JSON.parse(Promise)` would have thrown
into the same swallow-everything catch and hydration would still have started
empty. `write()` also needs the file to exist, so `flush()` calls `create()` when
it does not.

The test did not catch any of this because its fake file implemented the shape
the code *asked* for — `text(): string` — rather than the shape
`expo-file-system` actually publishes. It now mirrors the real contract:
`textSync()`, and a `write()` that throws when the file was never created.

Worth remembering: a `try/catch` around a `require` turns a resolution failure
into a silent capability downgrade. Both faults here were invisible at runtime
and invisible in CI.

## Auto-scroll during streaming, again

Two independent causes, which is why it kept coming back.

**`autoscrollToBottomThreshold: 0`.** FlashList v2 documents `0.2` for chat.
The threshold is how close to the bottom the reader must be for the list to keep
itself pinned as content grows; `0` means *exactly* at the bottom, so the built-in
follow was off in every practical case.

**Growth was being read as scrolling up.** `handleScroll` derived the live edge
from the distance to the bottom alone. While a reply streams, content grows
faster than a scroll can land, so that distance spikes — and the feed concluded
the reader had scrolled away and stopped following for the rest of the turn. That
is the behaviour being reported: it follows for a moment, then gives up and the
tail runs under the dock.

Leaving the live edge now requires a real gesture. `onScrollBeginDrag` sets a
flag, `onMomentumScrollEnd` clears it, and the decision moved into
`lib/feed-scroll.ts` so it is testable:

```ts
export function nextLiveEdge(frame: ScrollFrame, isDragging: boolean, current: boolean): boolean {
  if (isWithinLiveEdge(frame)) return true;
  return isDragging ? false : current;
}
```

Coming *back* to the edge needs no gesture, so a scroll that catches up rejoins
the follow on its own.

Third: the reply is drawn by `ListFooterComponent`, not a data row, and a growing
footer does not reliably raise `onContentSizeChange`. An effect on
`streamingText` follows the tail directly, deferred one frame so the footer has
been laid out at its new height. That is the only signal guaranteed to arrive on
every token.

## Evidence

- `bun run test` — 268 pass / 0 fail. `tests/feed-scroll.test.ts` pins all four
  cases: growth alone keeps the follow, a drag ends it, catching up rejoins it,
  and a reader who scrolled up is left alone while the reply streams.
- `tests/storage.test.ts` passes against a fake that mirrors the real
  `expo-file-system` contract, including a `write()` that rejects an uncreated
  file.
- Lint 167 files clean, typecheck clean, size gate clean.

## The pill knows how long the note is before you play it

`audioDuration` was null for every hosted note, so the pill rendered `0"` until
`expo-audio` loaded the file and reported a real duration — which only happens
once playback starts. Nothing upstream ever measured it: the TTS response carries
no duration, and the mp3 was passed through untouched.

Kokoro's mp3 has an ID3v2 tag and **no Xing or Info header**, so there is no frame
count to read; the length has to come from walking the frames.
`services/audio-duration.ts` skips the ID3 tag using its syncsafe size, then
decodes each frame header — MPEG version, layer, bitrate index, sample rate
index, padding — and sums `samplesPerFrame / sampleRate`. Kokoro emits MPEG-2
Layer III at 24kHz, which is 576 samples per frame rather than MPEG-1's 1152, so
assuming 1152 would have reported every note at half its real length.

Walking frames rather than dividing file size by bitrate costs nothing here and
stays correct if the encoder ever switches to VBR.

The duration rides along with the URL: a new `audio_duration` column, a `duration`
field on `audio_chunk`, and `audioDuration` in the transcript. `messages` gains
the column through an idempotent `PRAGMA table_info` check, since the schema is
`CREATE TABLE IF NOT EXISTS` with no migration runner.

## A silent no-op edit, and how it presented

Worth recording because the symptom pointed at the wrong layer entirely. The
first cut of this change appeared to work — the row had a URL, the file was in
the bucket — but the socket carried base64 with no URL and no duration, and the
`console.log` added to `storeVoiceNote` never printed.

`voice-notes.ts` had never been modified. Biome reformatted the `uploadAudio(...)`
call across three lines after the file was written, so a later exact-match edit
found nothing and wrote the file back unchanged. Every other file in the change
did apply, leaving `chat-turn.ts` calling `note.url` on a function that still
returned a bare string — `undefined` at runtime, which is falsy, which sent the
base64 branch. Types would have caught it instantly; the mistake was verifying
with a single targeted test instead of `bun run typecheck`.

## Evidence

- Live turn: `audio_chunk duration=2.02s url=yes base64=0`; the pill reads `2"`
  before playback. Reopening the chat reads `2"` from the transcript. Re-parsing
  the stored object returns `2.02s`.
- Cross-checked the parser against `ffprobe` on a stored note: ffprobe
  `4.536000`, parser `4.54`.
- `bun run test` — 272 pass / 0 fail, including four cases for the parser: frame
  summing, skipping an ID3v2 tag, a buffer with no frame, and an empty buffer.
- Lint 169 files clean, typecheck clean, size gate clean.

## Still open

- Notes stored before this change have a URL but no duration, and nothing
  backfills them. They will read `0"` until played.
