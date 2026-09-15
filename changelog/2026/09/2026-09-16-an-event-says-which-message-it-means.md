# An event says which message it means

**Date:** 2026-09-16
**Scope:** packages/protocol, apps/conductor, apps/canvas

## What changed

Every server event that concerns one stored message now names it.

- `image_ready` carries `message_id`. The worker had it on the line above and
  did not send it.
- `audio_chunk` carries `message_id` from both senders, `chat-turn` and
  `voice-turn`. Both had the id in scope.
- `message_committed` carries `text`, so the committed bubble is whatever the
  conductor actually stored.
- The client handles `text_replace`, which it had never handled at all.

`packages/protocol/tests/message-scoped.test.ts` pins the rule: every
message-scoped event must carry `message_id`, and the two lists in that test must
together name every event in `ServerMessageSchema`, so a new event cannot be
added without classifying it.

## Why

**Three separate bug reports were one bug.** A photo could not be read aloud, the
audio did not match the words on screen, and audio attached to the wrong bubble.
In each case the conductor knew which message the event was about and did not
say, so the client guessed: it minted its own id for a photo, and attached audio
to whichever assistant message happened to be last.

**The mismatch had a second cause, and a worse one.** `reply-stream` sends
`text_replace` five times — after a repeated line, after a reply that was all
stage direction, after stripping a speaker label, after converting brackets to
actions, and when an instruction leaked. The client had no case for it. So the
conductor corrected the reply, stored the corrected text, and synthesised audio
from the corrected text, while the bubble kept showing the uncorrected stream.
The audio was right and the words were wrong.

Rather than fix each correction path, the committed text now comes from the
conductor. The bubble is what was stored, always, which also covers mind-block
stripping and anything added later.

## Evidence

protocol 42, conductor 792, canvas 307, config 276. Typecheck and biome clean.

The audit, run over every event in `ServerMessageSchema`:

```
  id      audio_chunk, image_ready, message_committed, reply_options
  no id   status_update, text_delta, reasoning_delta, text_replace, queue_place,
          persona_updated, stage_shift, image_preview, image_failed, photo_ideas,
          mind_update, reply_suggestions, conversation_forked, message_enhanced,
          transcript, error, pong
```

Each of those seventeen was checked by hand: all are global or describe the
in-flight stream rather than a stored row.

**One regression was introduced and caught here.** Adding `message_id` to
`audio_chunk` stopped audio generating at all, because of ordering:

```
conductor  text_delta... -> message_committed -> speaking -> audio_chunk -> idle
client                                                                       ^ the message is created here
```

The audio arrives before the message exists. Without an id it had parked in
`pendingAudio` and the commit collected it; with an id it took the direct-attach
branch, matched nothing, and was dropped. The handler checks the message is
present before attaching and falls back to `pendingAudio` otherwise.

That regression passed 304 existing tests. Three new ones cover the ordering, and
they were verified by mutating the guard back and watching them fail.

## Follow-ups

- `attachAudioToLastAssistant` is still the path for an event with no id at all.
  Nothing the conductor sends today takes it.
