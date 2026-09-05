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
