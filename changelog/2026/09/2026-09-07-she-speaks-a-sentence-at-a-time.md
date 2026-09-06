# She speaks a sentence at a time, and cards travel as PNGs

**Date:** 2026-09-07
**Scope:** apps/conductor, apps/canvas, packages/config, packages/protocol

## What changed

**Voice arrives while she is still writing.** The turn used to synthesise the
whole reply after it had finished streaming, so the first sound landed seconds
after the last word. `createSentenceBuffer` now cuts the token stream at `.`,
`!`, `?`, a newline or an em dash, strips the stage directions out of what it
hands to Kokoro, and each sentence is spoken and pushed over the socket as it
completes. Measured against the local Kokoro node: 72–98 ms per sentence, so the
first sound arrives while the second sentence is still being generated.

The sentences are concatenated and queued on `s3UploadQueue` as a single
`upload-audio` job, so the finished note lands on RustFS and back into
`messages.audio_url` exactly as the batch path already did. The chat feed is
unchanged; it plays the archived note.

**A dedicated call screen.** `app/(main)/call/[id].tsx` — top bar with a tabular
amber timer and a speaker toggle, a 120dp avatar inside the four-ring Aqueous
Pool, a live subtitle card, and mute / push-to-talk / end-call. Back returns to
the chat without ending the call, so you can type while she talks.

**Tavern V2 cards.** `parseTavernCard` reads the `tEXt` or `iTXt` chunk, accepts
V1 flat cards, V2, and V3 under `ccv3`, base64 or plain JSON, and writes the
character, her greeting as message zero, her lorebook with its affinity gates,
her stage deck, pigment and affinity into SQLite. The PNG itself becomes the
PuLID face anchor: converted to WebP and uploaded as `avatar_anchor.webp`.
`exportTavernCard` reverses all of it. `POST /api/v1/characters/import` and
`GET /api/v1/characters/:id/export`, reachable from the home screen through
`expo-document-picker`.

## Why

**Two audio paths, not one, and the client has to be able to tell them apart.**
A live sentence chunk and the archived voice note are both `audio_chunk`. If the
chat store treated a sentence as the turn's voice note it would attach whichever
sentence arrived last to the message. The chunk therefore carries `live: true`,
and the two consumers filter on it. The turn only streams sentences when the
client asks — `live_voice` on `chat_turn`, set by the call screen — so an
ordinary chat turn does exactly what it did before and nobody pays for two
syntheses.

**The sentence cutter has to know what is inside asterisks.** `*she laughs.
loudly.*` contains two full stops that are not sentence ends, and cutting on
them would send "she laughs." to the voice. The scanner tracks whether it is
inside a stage direction and only cuts outside one, so an unclosed asterisk
holds the buffer back rather than leaking half an action into the audio.

**The silent fallback exists so a dev machine without a voice node still runs.**
When Kokoro is unreachable `synthesizeSentence` warns once and returns twenty
MPEG-1 Layer III frames of silence — 8340 bytes, 0.52 s. The WebSocket stream
never sees an exception and the call screen still advances through its queue.

**Sentences are written to the cache directory, not played as data URIs.**
`data:audio/mpeg;base64,...` is a 25 KB string per sentence through the bridge
and ExoPlayer's support for it is not something to bet a call on. They are
written to `<cache>/eidolon-call/` and played as file URIs, cleared on interrupt
and when the screen unmounts. That work lives in `use-call-audio`, not the
store: pulling `expo-file-system` into the store's module graph broke six canvas
suites that only wanted to test reducers.

**The pool is driven by real amplitude, not a loop.** `useAudioSampleListener`
gives PCM frames; the RMS of every eighth frame, smoothed with a fast attack and
a slow release, is written into a shared value that four `useAnimatedStyle`
rings read on the UI thread. Nothing animates when nothing is playing, which is
the rule for infinite motion. Android needs the recording permission for
sampling, so it is requested on mount and an unmetered device falls back to a
flat level while audio plays rather than to a fake waveform.

**The avatar becomes the face anchor because a Tavern card's only image is its
portrait.** Setting `face_url` as well as `avatar_url` and calling `forgetFace`
means the first photo she is asked for is generated against the face the card
shipped with, rather than a fresh one invented on the spot.

## Evidence

`bun run lint`, `bun run typecheck`, `bun run check:size` clean.
`bun run test`: 712 pass, 0 fail — conductor 464, canvas 185, config 38,
protocol 25. New: `voice.test.ts` (19), `tavern-card.test.ts` (22),
`card-parser.test.ts` (15), `cards-api.test.ts` (7), `call-store.test.ts` (22),
`transcribe.test.ts` (16). Totals after the second round of device fixes: 739 pass, 0 fail.

Against the live local stack (Kokoro on 8880, RustFS on 9000):

| Step | Result |
|---|---|
| `splitSpokenSentences` on a reply with a leading action | 4 sentences, action dropped |
| Kokoro per sentence | 72–98 ms, 17–25 KB each |
| `audio_chunk` frames emitted | 3, ordered, `live: true`, sentence text attached |
| Kokoro unreachable | one warning, 8340-byte silent MP3, no throw |
| Archive through `processUploadJob` | 58884 bytes on RustFS, byte-identical on download |
| `messages.audio_url` / `audio_duration` | set, 3.67 s |
| `POST /characters/import` | 201, `marisol-vega`, 2 lorebook rows |
| `GET /characters/:id/export` | 200, `image/png`, card reads back |

**A duration bug surfaced while checking the archive.** `mp3DurationSeconds`
reported 0.82 s for 3.67 s of audio. It walked frames and stopped at the first
byte that was not a frame header — correct for a single file with a trailing
ID3v1 tag, wrong for a concatenation, where that byte is the boundary between
sentence one and sentence two. It now skips ID3v2 and ID3v1 tags wherever they
appear and resyncs to the next frame that is followed by another valid frame,
within an 8 KB window. Three regression tests cover it.

## The call can hear you

**On-device recognition first.** `use-device-speech` drives Android's
`SpeechRecognizer` through `expo-speech-recognition` with `interimResults` and
`continuous` on, so your words land in the subtitle card while you are still
saying them. The amber button is push-to-talk: press-in interrupts her and opens
the microphone, release closes it and commits what was heard as a turn. It turns
green while it is listening and the caption under it reads "Release to send", so
the state is never only a colour.

**A Whisper node behind the same contract.** `transcribe.ts` posts multipart to
an OpenAI-compatible `/v1/audio/transcriptions` (`STT_API_URL`), and the new
`voice_input` socket event carries a recording, answers with a `transcript`
event, then runs the turn. `use-server-speech` records with `expo-audio` and
takes that route. The screen picks between them at runtime — on-device when the
platform has a recogniser, the node when `GET /health` reports `stt: healthy` —
so standing up a GPU transcriber later changes no screen code.

**Why on-device rather than only Whisper.** Whisper transcribes an utterance
after you stop: about a second of silence before any text appears. Android's
recogniser streams partials. For a call, the words appearing as you speak is the
whole point, and the Whisper path exists for hardware that cannot do it.

## The voice note was only the last sentence

Reported from a device: voice notes in the chat feed played only the tail of the
reply, and three of four pills read `0"`.

`live: true` was designed as the flag that separates a streamed sentence from the
turn's archived voice note, and the filter was implemented in the call store and
never in `chat-events.ts`. So the chat feed took every sentence as the whole note
and the last one won. Live chunks also carried no `duration`, which is where the
`0"` came from. It reached ordinary typed chat because backing out of a call
leaves it running on purpose, and every later turn then used the live path.

Measured on the reported reply, against the local Kokoro node:

| Path | Content | Duration |
|---|---|---|
| Batch, before this change set | whole reply | 7.63 s |
| Live, merged | whole reply | 7.68 s |
| Live, last sentence only — what played | "The daily grind never gets any easier." | 2.42 s |

Three fixes: `chat-events.ts` ignores `live` chunks; every live chunk carries its
own measured duration; and `finish()` emits one final non-live `audio_chunk`
holding the merged note and its length, so the feed gets the complete voice note
without waiting for the S3 round trip. A regression test pins it — it fails
against the unfixed reducer.

## Three defects from the first device test

**Two voices at once.** The merged note added above is committed to the chat
store, and `commitStreamingTurn` marks any message that arrives with audio for
autoplay. The chat screen stays mounted under the call screen, so its
`VoiceNotesProvider` — a second, independent `AudioPlayer` — started the full
7.68 s note while the call screen was still playing sentences one, two and
three. Two players, overlapping, on the same words. Autoplay is now suppressed
while `isCallLive`; the note still attaches to the message, it just does not
start itself. The `didJustFinish` effect also advanced the queue on every render
where the flag stayed true, which skipped sentences; it now consumes the flag.

**Nothing appeared until the button was released.** `CallSubtitles` keyed its
`Animated.Text` on the text itself and gave it `entering={FadeIn}`. Every interim
result produced a new key, so React unmounted and remounted the node and restarted
a 220 ms fade from zero. Partials arrive faster than that, so the caption never
finished appearing and only the settled final result was legible. The text now
updates in place and the fade belongs to the block, not the token — a live caption
should not animate per token at all.

**Her line replaced yours.** The card showed one speaker: `line = showsYours ?
yours : hers`. It now stacks both, labelled, so what you said stays on screen
while she answers and you can see whether she heard you. `beginTurn()` clears the
pair when you press to talk, so two exchanges never blur into one.

Android's recogniser is also started with explicit silence and minimum-length
intent extras, so a pause mid-sentence does not end the session early.

## Two more from the second device test

**The caption showed one sentence, not the reply.** `handleServerMessage`
assigned `subtitle: chunk.text`, so each arriving sentence replaced the last and
the card settled on whichever came in final. The voice played the whole reply
while the screen showed its tail. It accumulates now, and the card scrolls and
pins to the bottom rather than truncating at four lines — her replies run to
`CHAT_TURN.maxTokens`, which is far more than fits.

**Interim results never arrived, and `continuous: true` is why.** The reported
transcript came back as "what are you doing" with no question mark, which says
Android was using network recognition — `addsPunctuation` is documented as
Android 13+ *and* on-device only, so its absence identifies the path. Recognition
itself worked; only the partials were missing, and Android's continuous mode
routes through a segmented session rather than the standard partial-results
callback.

`continuous` is now off, which is the configuration that emits partials, and the
session is restarted on `end` and on `no-speech` for as long as the button is
held. Releasing sets a `releasing` flag, so the same `end` event means "restart"
while held and "commit" once let go. Text accumulates across restarts, so a pause
mid-sentence no longer truncates the turn — which is what `continuous` was there
to prevent.

This is a second attempt at the same symptom. The first fix — the caption keying
its `Animated.Text` on its own content and restarting a fade per token — was a
real defect and is still fixed, but it was not the cause.

## Reading the recogniser's source instead of guessing again

Two remote diagnoses of the missing interim results were wrong. The third came
from `ExpoSpeechService.kt` in the package itself, which sets the flag and quotes
the platform contract next to it:

```kotlin
// The server may ignore a request for partial results in some or all cases.
intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, options.interimResults)
```

Google's **network** recogniser ignores it. That is why toggling `continuous`
changed nothing — the extra is set identically either way. The reported
transcript arriving without a question mark had already identified the network
path, since `addsPunctuation` is on-device only; that detail was the evidence and
it was not followed far enough the first time.

`requiresOnDeviceRecognition` is therefore on wherever
`supportsOnDeviceRecognition()` is true, which honours partials and restores
punctuation, and falls back to the network recogniser on `language-not-supported`
— the error that means the language pack was never downloaded.

**`continuous` is back on.** On Android 13+ it attaches an `ExpoAudioRecorder`
and a segmented session, which emits incremental results through
`onSegmentResults` *and* does not end the session on its own. The restart loop
added in the previous round existed only to paper over a self-terminating
session, and it caused both reported faults: `stop()` landing while a restart was
still in flight was ignored, so no `end` arrived and the button stayed green for
ever; and when an `end` did arrive it belonged to a restarted session containing
no speech, which is what produced "That did not come through". The loop is gone.

**The capture is a state machine now** — `idle → starting → listening → ended |
stopping → idle` — so an `end` that arrives while the button is still held marks
the session finished and waits for the release rather than committing early, and
a release after that commits without calling `stop()` on a dead session. A
watchdog settles the turn if `end` never arrives at all, so nothing can wedge the
button again.

## Tap to talk, tap to send

Push-to-talk is gone. The amber button is a toggle: one tap opens the
microphone, another closes it and sends. It reads "Tap to talk" then "Tap to
send", and turns green while it is listening.

Holding was chosen for the reason it usually is — an open microphone is explicit,
and there is no ambiguity about when a turn ends. What it cost was a press-out
that had to land exactly, on a recogniser whose session can end underneath it.
Every button fault in this change set came from that seam. Two discrete taps have
no such seam: each is a committed action against a state the button can read.

## Half-duplex gating: no button to talk

The microphone opens itself. Whenever she is neither thinking nor speaking, the
recogniser is live; `speechend` starts a 900 ms timer and, if no `speechstart`
arrives before it fires, the turn commits. `speechstart` cancels the timer, so a
pause to think does not send. The mic closes while she talks and reopens 400 ms
after she stops, which keeps the tail of playback out of the transcript.

**It is half duplex because Android cannot do better here.** The recogniser
records from `MediaRecorder.AudioSource.VOICE_RECOGNITION` and the package wires
no `AcousticEchoCanceler` and no `VOICE_COMMUNICATION` source; iOS gets
`setVoiceProcessingEnabled(true)` on both nodes and Android gets nothing. With
the mic open while Kokoro plays through the speaker, she would transcribe herself
and answer her own words. Gating the mic is what makes an always-on microphone
survivable on a speakerphone.

What gating costs is barge-in, so the amber button keeps that job and only that
job: it reads "Cut in" and is live only while she is speaking or thinking. The
mute button rings green while the microphone is actually open, because an
always-on mic that gives no sign of being on is not something to ship.

Server-side transcription stays manual. Endpointing needs the recogniser's own
speech boundaries, and a recording uploaded after the fact has none, so a device
without its own recogniser keeps tap-to-talk.

`SPEECH.autoListen` turns the whole thing off and returns the button to
tap-to-talk, and `endpointSilenceMs` is the one number worth tuning against a
real room.

## The gate opened while she was still talking

Reported from the device: her reply cleared itself the moment it appeared, and
turns broke mid-sentence with "That did not come through" printed underneath the
words that had plainly come through.

Both came from the gate, and the first is the interesting one. `status_update:
idle` set the phase from `queue.length`, but a sentence leaves the queue when the
player *starts* it, not when it finishes. The conductor finishes a turn long
before the audio does, so the queue emptied, the phase fell to `listening`, and
the microphone opened over the top of her own voice. The recogniser heard her,
`speechstart` fired, and `beginTurn()` wiped the reply that was still being
spoken. The gate now reads `audio.isPlaying` as well as the phase, which is the
only thing that actually knows whether sound is coming out.

`beginTurn()` has also moved from `speechstart` to the commit. Clearing the pair
the instant a microphone hears *something* means any noise in the room deletes
her answer; clearing it when a turn is genuinely sent does not.

The breakage mid-sentence was `settle(false)` in the error path, which discards
the accumulated text. Android reports `no-speech` on a pause it did not like, and
that discarded a half-spoken turn; the endpoint timer then committed the empty
session that followed and reported nothing came through. A benign `no-speech` or
`aborted` now ends the session while keeping what it heard, and `begin()` carries
that text into the session auto-listen reopens, so a hiccup mid-sentence costs a
few hundred milliseconds instead of the turn.

**Interim results are confirmed working on device.** The screenshot showed a
partial mid-sentence fragment, which settles the question the previous three
rounds could not: on-device recognition is being selected and it streams.

## Follow-ups

- **Nothing here has run on a device.** The Aqueous Pool's feel, the interrupt
  latency, the haptics and the document picker are all unverified on hardware —
  judged only against a typechecked build.
- **Speech input is unverified on hardware.** On-device recognition needs a
  prebuild before `RECORD_AUDIO` and the recogniser query land in the manifest,
  so none of the push-to-talk path has run on a device yet.
- **No transcription node is running here.** `STT_API_URL` is unset, so the
  server fallback is covered by tests against a stub rather than by a real
  Whisper node.
- **A reply that is replaced after streaming has already been spoken.** The
  third-person and repetition guards issue `text_replace`; the voice said the
  original. Fixing it means holding the first sentence back until the guards
  have run, which costs the latency this change set was for.
- Ports: Kokoro is read from `TTS_API_URL`, which is `:8880` on this machine —
  the Kokoro-FastAPI default — not `:8000`.
- The graph was rebuilt with `/graphify . --update` after this change set.
