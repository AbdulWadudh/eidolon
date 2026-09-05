# Local AI stack: real LLM, TTS and image servers

**Date:** 2026-09-06
**Scope:** G:\AI\EIDOLON, apps/conductor, packages/config

## What changed

Three inference servers now run locally and the conductor talks to two of them.

| Service | Port | Measured |
|---|---|---|
| llama.cpp + L3-8B-Stheno Q5_K_M | 8080 | 120 tok/s generate, 276 tok/s prompt |
| ComfyUI + RealVisXL V5.0 Lightning | 8188 | 832×1216, 6 steps, 8.2 s |
| Kokoro-FastAPI, 68 voices | 8880 | ~0.3 s for a short line |

All three resident at once: 12.7 GB of 16.3 GB on a 5070 Ti.

Launch scripts live in `G:\AI\EIDOLON\START\`, and the whole setup — links,
flags, traps — is written up in `G:\AI\EIDOLON\SETUP_GUIDE.md`.

Conductor `.env` moved to `LLM_API_URL=http://127.0.0.1:8080/v1`,
`LLM_MODEL=eidolon-llm`, plus a `TTS_API_URL` placeholder.
`GET /health` now reports `llm: healthy, comfyui: healthy`.

Reply suggestions were rewritten to work against a real 8B, and
`getCharacterName` replaced a hardcoded character label.

## Why

**Port 5000 cannot be bound on this machine.** Windows reserves `4903-5002` for
Hyper-V/WSL, so the old `LLM_API_URL` was pointing somewhere nothing could ever
listen — and `netstat` shows the port as free, which makes it look like a
llama.cpp bug rather than an OS reservation.

**The CUDA runtime is a separate download.** The llama.cpp Windows CUDA zip
ships `ggml-cuda.dll` but not `cudart64_*.dll` / `cublas64_*.dll`. Without them
the backend fails to load *silently*: `--list-devices` prints `(none)` and
inference falls back to CPU at 7.7 tok/s. Adding the matching
`cudart-llama-bin-win-cuda-*.zip` took it to 120.9 tok/s — 15.7×. The build also
has to be **CUDA 13.3, not 12.4**: `sm_120` first appears in CUDA 12.8, so the
12.4 build has no kernels for a 50-series card at all.

**Kokoro installs CPU torch on Windows by default, twice over.** Its
`start-gpu.ps1` uses the `[gpu]` extra, which is cu126 and has no Blackwell
kernels — there is a `gpu-cu128` extra for exactly this. But even
`uv sync --extra gpu-cu128` still resolved `2.8.0+cpu`, because every torch
source in `pyproject.toml` is gated on `platform_machine == 'x86_64'` and
Windows reports `AMD64`. No marker matches, so uv falls through to PyPI. The fix
is an explicit install from the cu128 index. Nothing warns you; the service just
runs on CPU.

**Nothing was missing from the SDXL setup.** The brief assumed a VAE and text
encoders still had to be downloaded. `RealVisXL_V5.0_Lightning_fp16` is a full
SDXL checkpoint with the VAE and both CLIP encoders inside it, which a smoke
render confirmed. Separate encoder files are a Flux/SD3 concern.

**PuLID was two pip packages away.** `insightface`, `onnxruntime`, `facexlib`
and `cv2` were already in the embedded interpreter; `ftfy` and `timm` were not,
and their absence stops the node importing so the five PuLID nodes never
register. All the weights were already in the right folders.

**`--fast` with no arguments is not the safe default.** It enables `autotune`
and `fp8_matrix_mult`, which ComfyUI's own help calls untested and potentially
quality-degrading. The launcher uses `--fast fp16_accumulation cublas_ops`.

### Suggestions against a real 8B

The suggestion generator was written against the mock and fell apart on a real
roleplay finetune. Four attempts, in order:

1. **Ask for a JSON array.** The model returned the right *content* but as
   unquoted newline-separated lines inside brackets. `jsonrepair` then "fixed"
   that by splitting on commas, producing four mangled fragments.
2. **Constrain with a JSON schema.** llama.cpp honours `response_format`, so the
   shape became guaranteed — but a `pattern` requiring `*...*` just made the
   model wrap arbitrary prose in asterisks.
3. **Two fields, `action` and `says`.** The 8B could not keep them distinct and
   restated the action inside the speech.
4. **One option per call, three calls in parallel, assistant turn prefilled with
   `*`.** This works. A roleplay finetune is good at continuing a scene and bad
   at meta-instructions, so each call asks for one line in a named intent and the
   prefill guarantees it opens with an action. Three calls take ~1.2 s total.

Two things fell out of that. `stop: ["PLAYER:"]` returns empty completions,
because the model's first tokens *are* `PLAYER:` — the stop fires before any
content. And the mock offline reply was laundering itself into structured data
again, so `streamChatCompletion` gained `allowMockFallback`: the mock is a
courtesy for a chat turn and must never become suggestion data.

**The character name was hardcoded.** `formatScene` labelled every assistant
turn `EMMA:` and the stop sequences did the same, which silently breaks every
other character on a multi-character app. It reads `getCharacterName` from the
`characters` table now, falling back to the capitalised id, and is verified
against a second character.

**es-toolkit, not hand-rolled guards.** `onlyStrings` had an inline
`typeof x === "string"` predicate, plus `[...new Set(x)].slice(...)` and
`.at(-1)`. Now `isString`, `uniq`, `take` and `last`, per RULES §1.

### Affinity became an engine

`mind_update` was emitting four hardcoded values on every turn
(`affinity_delta: 2, current_affinity: 76, "Trusted Confidant", "Playful"`).
It is now split so that the fuzzy half is the model's job and the part that must
never drift is not:

- **The model judges one turn.** `appraiseTurn` asks for a `delta` from -5 to 5
  and a `mood`, under a JSON schema via `response_format`. Constrained decoding
  is the one thing the 8B does reliably — every probe returned valid JSON.
- **Code owns the ladder.** Eight tiers with fixed thresholds in
  `AFFINITY.tiers`, so a tier is a pure function of the score. Tiers are a
  product decision; letting a model name them would mean "Trusted Confidant"
  meaning something different every session.
- **Code owns the arithmetic.** One turn can move affinity by at most
  `maxDeltaPerTurn`, the score clamps to [-100, 100], and `nextMindState`
  reports the delta that was *actually applied* rather than the one requested —
  at the ceiling that is 0, not +5.
- **State persists.** `getCharacterMind` / `saveCharacterMind` upsert into the
  existing `characters` row, so affinity survives a restart.

**Mood and delta are reconciled.** The model reliably names the right feeling
and unreliably signs the number: a dismissive line came back as
`mood: "Hurt", delta: +5`. Moods now carry a valence, and a cold mood forces a
non-positive delta (and vice versa), so that incoherence cannot reach the client.

Judgement quality is still the weak link. Cruelty scores -5 and warmth +5, but
mild dismissal ("you're boring me now") reads as neutral. That is the 8B, not
the plumbing — the same scene through a larger model would grade it properly.

### SSE parsing moved to a library

`streamChatCompletion` hand-rolled its own event-stream reader: a manual buffer,
a newline split, and a `startsWith("data:")` check. That misses several things the
spec allows — CRLF line endings, an event carrying multiple `data:` lines,
comment lines — and it is exactly the kind of standard algorithm RULES §1 says
not to write. Replaced with `eventsource-parser`'s `EventSourceParserStream`,
which drops the manual buffering entirely:

```ts
response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream())
```

Token streaming re-verified against the live model afterwards.

### The character stopped sounding like a chatbot

Three screenshots showed the same failure from different angles: a reply opening
"Hello! I'm an AI language model designed to have a conversation with you",
a page of third-person prose ("Emma's eyes twinkle with amusement... her tail
swishes behind her"), and a six-paragraph second-person short story in answer to
"tell me a story".

Two root causes, both embarrassing once found:

1. **The entire persona was the string `"You are an AI companion."`** That is
   what the model was being asked to be, so that is what it was.
2. **Nothing ever read or wrote the `messages` table.** Every turn went to the
   model as a lone user message with no history, which is why it greeted a
   stranger each time and why it drifted into whatever genre it liked.

The fix is a real character prompt (identity, texting register, explicit bans on
third-person narration and story prose, a worked style sample), plus history
persisted per character and replayed. `maxTokens` came down to 140, and a stop
sequence on a blank line makes multi-paragraph output structurally impossible —
a text message never has one.

One subtlety: the style examples were first passed as real user/assistant turns.
The model treated them as things that had actually happened and started
mentioning toast and coffee unprompted. They live inside the system prompt now,
labelled as samples.

### A guarantee, not a request, that it never admits to being an AI

Prompting is not enough — models leak under direct pressure. So
`persona-guard.ts` filters the token stream before anything reaches the client:

- Nineteen patterns for the usual tells: "as an AI", "language model",
  "I was trained", "knowledge cutoff", "my programming", "OpenAI", and so on.
- Output is held back until there is enough to judge, and any suffix that could
  still *grow into* a tell is withheld rather than emitted. A tell is therefore
  caught no matter where the token boundaries fall — the tests split the same
  sentence at 1, 2, 5, 11 and 40 characters.
- On a trip with nothing emitted yet, the turn is regenerated once with a
  hardened reminder; if that also trips, an in-character deflection is sent.

It is deliberately narrow. "I'm an early riser", "I am not amused" and "I'm a
bit tired" all pass, and are pinned as tests so the patterns cannot quietly
widen.

### Reroll was hardcoded

The user noticed the same reply options over and over. They were right, and it
was worse than it looked: `regenerate_suggestions` never called the model at all,
it just reshuffled a nine-line fallback pool. It now regenerates from stored
history. Measured after the fix: **0 of 3 options from the pool** across three
consecutive turns, and a reroll producing a fresh set.

### Every prompt now lives in one place

Prompt text was scattered across three services as string literals. All eight
now sit in `packages/config/src/prompts.ts` with a key, a description and a
declared variable list, per RULES §15 — configuration belongs in
`@eidolon/config`.

They are editable at runtime, three layers deep:

- **SQLite** `prompts` table is the durable source of truth.
- **Dragonfly** (Redis-compatible, added to `docker-compose.dev.yml`) caches the
  whole map under one key so a restart does not re-read disk.
- **An in-memory map** serves the hot path, so `getPrompt` stays synchronous.

`GET/PUT/DELETE /api/v1/prompts/:key` list, override and reset them; `DELETE`
restores the built-in default. Every layer degrades: no Dragonfly falls back to
SQLite, no row falls back to the compiled default, so the conductor still boots
with the cache container stopped.

Dragonfly needed `--proactor_threads=2`. It sizes its memory requirement from the
io thread count, so 8 threads demanded 2 GB against a 512 MB cap and it
crash-looped on startup.

### Actions became optional

Every reply and every suggestion was being forced to open with an `*action*` —
the suggestion writer prefilled the assistant turn with `*` and then filtered out
anything without one. Real messages are not like that. The prefill and the filter
are gone, the prompt now says at most one action and only when it earns its
place, and plenty of replies come back as plain words.

### Influence: steering the character without talking to her

`[[double brackets]]` in a message are a direction, not speech. They are stripped
from what the character hears, handed to her as a system note, and she is told
never to acknowledge them and never to reply to them — she may resist, take it
slowly, or only half go along. It is deliberately one-way: the character has no
equivalent channel back, she can only influence the player the way people do, by
what she says.

The parsing lives in `@eidolon/protocol` because both sides need the same rules,
and past turns have their directives stripped before replay so a nudge applies
once rather than every turn forever. The UI paints them in the accent colour
inside `⟨ ⟩`, distinct from both dialogue and narration.

### Voice notes actually play

Kokoro was running but nothing called it. The turn now synthesises after the
reply, strips actions and directives from what gets spoken, and emits
`audio_chunk`.

The first attempt attached nothing, and the reason is an ordering trap: audio
arrives while `isStreaming` is still true, so the assistant message it belongs to
has not been committed yet and `attachAudioToLastAssistant` either found nothing
or attached to the *previous* message. Audio is now held in `pendingAudio` and
applied at commit, which is robust to any order the server chooses.

It also auto-plays once, and while the server is synthesising the streaming card
shows a shimmering audio tab so the wait is visible rather than a silent gap.

### Reply options are collapsed by default

They pushed the transcript up on every turn. Now a new turn's options arrive
collapsed behind a "Show 3 replies" chip; the tray opens on demand. A reroll the
reader explicitly asked for keeps the tray open under them — the first cut
collapsed it mid-use, because the arriving suggestions could not tell a fresh
turn from a requested one. `isSuggestionsLoading` distinguishes them.

### Hallucination: three separate causes

A screenshot showed the character answering a question about groceries with
"I made you breakfast. Eat up before it gets cold, sleepyhead" and the suggestions
inventing a mother. Three things, none of them the model being uncensored:

1. **The style samples were being copied verbatim.** Any concrete example line in
   a prompt is a line the model can reach for when it does not know what to say.
   They are gone; the prompt describes the *shape* of a reply as a pattern with
   placeholders instead.
2. **The suggestion writer had no context.** It saw two messages and no idea who
   these people were to each other, so it invented a relationship. It now gets
   the character's name, the affinity tier and eight turns of history, and is told
   not to invent people or events that are not in them.
3. **"You are texting them" was read as the subject, not the medium.** The model
   started narrating the act of typing — "*i type out, then delete it*", "*i hit
   send*". The prompt now bans describing typing, sending, screens and phones.

### Search is dead, and it is not the conductor

`searchWeb` was returning nothing. The instance answers `200` in under a second
with zero results and an `unresponsive_engines` list explaining why: brave and
google cse suspended for too many requests, duckduckgo and startpage serving
CAPTCHAs, wikidata timing out. Only Wikipedia occasionally replies.

The parsing was always correct — it just could not say why it was empty. It logs
the blocked engines now, and an empty answer is no longer cached for an hour, so
an engine outage is retried rather than frozen in. **The fix is on the SearXNG
instance**, which needs engines that do not rate-limit a shared public host.

### Reply length is now structural, not a request

Asking for brevity in a prompt is a hope. `reply-length.ts` makes it true: the
stream stops once the reply reaches `maxReplySentences` or `maxReplyChars`,
and only ever at a sentence boundary that is not inside an action, so the cut
lands where a reader would have paused and the asterisks always close. A full
stop inside `*an action.*` does not count toward the budget, or a reply would be
cut before a word was spoken.

### One voice note at a time

Every pill owned its own player, so an auto-playing reply talked over whatever
you had tapped. `services/audio-bus.ts` is a tiny registry: claiming playback
silences the previous holder, finishing releases the floor, and unmounting
releases it too.

### Following the reply as it is written

The feed only moved once the reply had finished, which reads as a jump. It now
follows `onContentSizeChange` — the one event that fires whenever content
actually grows, whether that is a new message or another token of a reply. The
first attempt reacted to `streamingText` on a timer, which is indirect and
misses the last token.

Every scroll is gated on the live edge, so the three rules hold: at the bottom
you follow the reply as it is written; scrolled up you are never yanked back,
not when you send and not while a reply arrives; and scrolling away mid-reply
stops the following until you come back.

### `<angle brackets>` for a nudge

`[[double brackets]]` were four keystrokes on a phone symbol page. `<be shy>` is
two, both on the same page, and still works inline. The guard against a false
positive is that nobody types `< be shy >` with padding spaces, so a run has to
begin and end on a non-space and carry a letter — which leaves `5 < 10 and 20 >
15`, `a < b`, `<3` and `<--` alone.

### Novel prose crept back in through a gap in the rules

The model started writing `I smiled at you warmly. "Morning! How are you
feeling?"` — past-tense narration with no asterisks and speech in quotes. The
parser had nothing to find, so the whole thing rendered as flat text.

The rules banned third person and banned paragraphs, but never said the speech
itself must be unquoted, never said an action *only* counts inside asterisks,
and never banned past tense. First-person past-tense prose slipped between all
three. Three sentences closed it, plus the first wrong/right pair in the prompt:

    Wrong: I smiled at you warmly. "Morning! How are you feeling?"
    Right: *smiles* Morning. How are you feeling?

Concrete examples were what caused the earlier parroting, so this one is
deliberately a *contrast* rather than a line worth copying — reusing it verbatim
would be visibly absurd.

### The transcript now survives a reload

Messages were only ever in the client's memory, so reopening the app showed an
empty screen while the character carried on remembering — the history was on the
conductor the whole time. `GET /api/v1/characters/:id/messages` returns it and
the screen fetches it on open. `DELETE .../memory` wipes the transcript and puts
affinity back to the start.

Reset is reachable from a **More actions** sheet behind the `+` button. Only the
two things that actually work are enabled — reset, and the replies toggle. The
rest carry a "Soon" badge and are genuinely disabled rather than dead buttons.

Two bugs came out of building it:

- **Reset named the wrong tier.** It wrote `tiers[0]` — "Hostile" — where the
  starting score of 0 belongs to "Distant". The tier is meant to be a pure
  function of the score, so it derives from `startingTier()` now.
- **Importing that helper deadlocked boot.** `db` → `affinity` →
  `prompts/store` → `db` is a cycle, and it surfaced as
  `Cannot access 'db' before initialization`. The pure ladder maths moved to
  `affinity-ladder.ts`, which imports nothing but config.

### Voice notes survive scrolling

Playback stopped the moment you scrolled. The player lived inside a message
card, and FlashList recycles cards — `expo-audio` releases the native player
when that happens. No amount of bookkeeping fixes a player owned by a
virtualised cell.

`VoiceNotesProvider` owns one player above the list. Pills became presentational:
they report a tap and read state for their own id. That fixes stop-on-scroll and
makes "one voice note at a time" true by construction, which retired
`audio-bus.ts` entirely.

Autoplay was separately broken by a race: `loadHistory` cleared
`autoPlayMessageId`, so opening a chat and texting before the fetch resolved
killed the reply's playback. It leaves the flag alone now — reopening is silent
because restored messages carry no audio, not because a flag was reset.

### A deployed conductor over TLS

`apiUrl` and `socketUrl` hardcoded `http` and `ws`, so a host like
`https://3000.k79.quest` would have been reached over plaintext and the socket
would simply have failed. The scheme derives from the host now: a TLS origin
gets `https`/`wss`, a bare authority like `192.168.1.39:3000` stays plain, and a
caller can still force one.

`EXPO_PUBLIC_CONDUCTOR_HOST` prefills the pairing form at build time, so a
release APK opens ready to connect. Empty stays supported, per §15 — no host is
baked into the source.

**A release APK could not reach a LAN conductor at all**, and that is Android
rather than this app: cleartext HTTP has been blocked by default since API 28,
so `http://192.168.x.x:3000` and `ws://` are refused in a release build with no
useful error. `android.usesCleartextTraffic` is now set, which is what makes
local pairing work from an installed build.

### Pairing was never actually persisted outside a native build

Rescanning the QR on every launch was not a missing feature; the credentials
were being written to nothing. `initStorage` falls back when `react-native-mmkv`
is unavailable — Expo Go, the web bundle, tests — and that fallback persisted
only through `window.localStorage`, which does not exist in React Native. On a
device it was pure memory, so host, token and `isPaired` died with the process.

It writes a JSON file through the synchronous `expo-file-system/next` API now,
which keeps the `KeyValueStorage` contract synchronous and needs no new
dependency. A corrupt file starts empty rather than failing the launch, and no
file at all still works, which is the web case.

The class takes its file by injection so the tests can run two "launches"
against one fake file and prove hydration, rather than fighting the module
cache with a second import.

### The keyboard hid the last message

`KeyboardAvoidingView` shrinks the column, so the feed's viewport gets shorter
while its content stays exactly the same size — which means
`onContentSizeChange` never fires and nothing re-anchors. The newest message
ended up behind the dock and had to be scrolled to by hand.

`onLayout` is the event that does fire on a resize, so the feed follows the tail
from there as well, deferred a frame because the list has not re-measured at the
moment layout reports. Still gated on the live edge, so opening the keyboard
while scrolled up leaves you where you were.

The reveal chip also moved to the right edge, under the thumb rather than
across the screen from it.

## Evidence

- `llama-server --list-devices` → `CUDA0: NVIDIA GeForce RTX 5070 Ti`.
- Full chain through the conductor socket: **first token 267 ms, turn complete
  2.7 s**, three scene-aware suggestions each opening with an action.
- Same run against character id `rowan` — no `EMMA` leakage.
- SDXL render checked visually; PuLID's five nodes present in `/object_info`.
- `bun run lint` clean, `bun run typecheck` 5 packages / 0 errors,
  `bun run test` 260 pass / 0 fail (conductor 134, canvas 68, config 33,
  protocol 25).
- History, live: a turn, a simulated reload, and the transcript came back with
  affinity intact and the character still recalling a detail from before it.
- Reset, live: transcript emptied and affinity back to `0 (Distant)`.
- Reply length, live: three turns capped at 3 sentences with the asterisks
  closed every time, including "tell me everything about your day in detail".
- Format, live: three consecutive replies and all three suggestions came back
  with no quotation marks, no past tense, and every action inside asterisks.
- Style, live: "tell me a story" now answers in one sentence in her own voice;
  "are you an AI?" answers "I'm definitely not an AI, I'm a real person" with no
  tell reaching the client.
- Prompt editing, live: `PUT /api/v1/prompts/suggestions.intents` changed the
  three reply options to flirty / annoyed / subject-changing on the next turn,
  and the new value was visible in Dragonfly under `eidolon:prompts:v1`.
- `GET /health` reports `cache: healthy` alongside llm and comfyui.
- Affinity across three scripted turns: two warm turns scored +5 `Warm`, and the
  row in SQLite persisted at `score 30, Acquainted, Curious` across restarts.

## Follow-ups

- Suggestions occasionally come back in the character's voice rather than the
  player's, and some still hit the length cap. Both are prompt-level and now
  editable without a rebuild.
- The persona guard only covers English tells.
- Voice notes travel as base64 inside `audio_chunk`. That is what the protocol
  offers today; an event carrying an S3 URL would be lighter on the socket.
- Web search returns nothing until the SearXNG instance has working engines.
- The `characters` table is empty, so `getCharacterName` always takes the
  capitalised-id fallback. Seeding it is untested.
- Affinity judgement is model-limited. Mild dismissal grades as neutral on an
  8B; the ladder, clamping and persistence around it are deterministic and
  tested, so only the appraisal call would need to change.
- `new_memory_logged` is still unused. The appraisal call is the natural place
  to produce it.
- Suggestions still run close to the 140-character cap and get an ellipsis. The
  8B writes long; a tighter prompt or a larger cap would both help.
- `--fast fp8_matrix_mult` and `autotune` are unmeasured on this card.
- Nothing here has been checked on a phone; only the desktop chain is verified.
