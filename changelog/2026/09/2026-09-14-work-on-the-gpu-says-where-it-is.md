# Work on the GPU says where it is

**Date:** 2026-09-14
**Scope:** apps/canvas, apps/conductor, packages/config, packages/protocol

## What changed

- A queued portrait says **on the GPU now**, **next**, or **third of three**, and
  the number moves as the queue drains.
- Pushed over the socket, not polled: the conductor recomputes places whenever a
  job is queued and whenever one finishes, and broadcasts to that reader's own
  sockets via `broadcastToReader`.
- Portraits always announce. **Chat photos do not**, unless the switch in the
  admin sheet says otherwise (`QUEUE_ANNOUNCE.chatPhotos`).
- A photo asked for in a chat is a **queue job**, so it survives a dropped socket.
- Toasts can be **sticky**, and a sticky one is drawn in place rather than in a
  Modal.

## Why

**A minute of silence is indistinguishable from a broken conductor.** A portrait
took that long and said nothing, so a queue of three looked like a server that
had stopped answering.

**Clearing the message needed a rule, not a list.** It first cleared on
`image_ready` and `image_failed` — both chat-photo events — so a portrait, which
finishes silently, left it on screen for ever. A reader who drops out of the
queue is now told so, which covers every kind of work with one rule instead of an
enumeration that will always miss one.

**A Modal takes every touch.** Toasts were wrapped in one so they could clear an
open sheet. At two and a half seconds nobody noticed; held open it blocked the
whole app. Sticky toasts render in place, and expire after ninety seconds
whatever happens — sticky should never have meant forever for something drawn
over the UI.

**Generation used to die with the socket.** It ran inline on the websocket
handler holding that connection's abort signal, and a paint that finished after
the socket closed was discarded by an `aborted` check *before* the message was
written: made, paid for on the GPU, and lost. It is a queue job now, like the
portraits and backdrops that already worked this way.
