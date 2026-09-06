# Portraits stop being destroyed, pictures zoom, and the feed stops fighting the reader

**Date:** 2026-09-06
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

**A portrait is a row now, not a column.** `characters.avatar_url` was the only
place a portrait lived, so rendering a new one destroyed the one it replaced.
Every render is written to `character_portraits` and the column just points at
whichever is currently in use. The gallery reads the table, marks the one in use
with `isAvatar`, and tapping **Profile picture** on an older portrait moves the
pointer — it copies nothing and deletes nothing. Portraits already on disk were
adopted into the table on first boot, so nobody loses the face they have been
talking to.

Nothing in the gallery is removed unless you remove it. Delete on a portrait
removes that row; delete on a chat photo still removes it from the conversation
it belongs to, which is a different thing and says so.

**The portrait generator is reachable from her profile** — a sparkle in the top
right of her picture — rather than only from a section of her settings. It is
the page you are on when you decide her picture is wrong.

**Gallery pictures pinch to zoom**, drag to pan and double tap to toggle. The
pager stops claiming horizontal swipes while a picture is zoomed in, and
swiping to another picture puts the last one back the way it was found.

**Three feed defects.**

- Scrolling up quickly snapped back to the bottom. A fast flick renders more
  rows, which raises `onContentSizeChange` before the throttled scroll event has
  arrived, so the follow still read the edge as live and yanked the reader back
  mid-gesture. The live edge is now dropped the moment a drag begins, and
  restored on the next frame if the drag ends up near the bottom anyway.
- Rows came up blank during a fast scroll. `drawDistancePx` was 480, which a
  flick outruns; it is 1400.
- "Find it in the chat" did nothing.

## Why

The focus scroll failed twice, for two different reasons, and both are worth
recording. First it gave up: the chat screen mounts before its history arrives,
so the message being looked for was not in the list yet and the code cleared the
request rather than waiting for it. Then it still failed, because FlashList
cannot scroll to an index it has not measured and a screen that has just mounted
has measured almost nothing. It now asks repeatedly for a short while, and drops
the live edge first — otherwise the next content change pulls the reader
straight back to the bottom it just left.

Zoom failed twice as well. Gesture handlers do not cross a `Modal` boundary, so
without a `GestureHandlerRootView` inside the modal every pinch was swallowed —
the chat's own photo viewer already had one. Then gesture-handler warned that
none of the callbacks were worklets, which means the whole gesture was running
on the JS thread a frame at a time. Every callback is marked now, and the only
thing that crosses back to React is whether the picture is zoomed, scheduled
once per gesture end rather than per frame.

Ordering also turned out to be luck. Photos written in the same millisecond fell
back to comparing UUIDs, which is not an order; the union now carries `rowid`
through as a tiebreaker, the same way the message queries already did. A test
caught this rather than a reader.

The jump then worked and immediately undid itself. It starts at the bottom, so
the opening frames of its own animation are inside the live edge; reading those
re-armed the follow, and the next layout carried the reader back down a moment
after arriving. A scroll driven by code is now ignored entirely rather than
merely discounted, which is a decision that belongs in `feed-scroll.ts` with the
rest of the live-edge logic, where it can be tested.

## Evidence

Live, against the running conductor:

```
adopted on boot   cass-delaney 1, emma 2, ines-vaz 1, nadia-kerr 1
GET emma/gallery  2 portraits, isAvatar true on exactly one
POST emma/avatar  200, switched to the other portrait
GET emma/gallery  still 2 — nothing destroyed, isAvatar moved
DELETE a chat photo through the portrait route  400, with a reason
```

Two new conductor tests cover the point of the change: a portrait no longer in
use is still listed, and the gallery marks which one is her profile picture.
Five new canvas tests cover `trackLiveEdge`: the opening frames of a jump are
ignored, so are the frames where it arrives, a reader who was following before
the jump is not stranded, control is handed back once it is over, and a real
drag still takes the reader off the live edge.

Suites: conductor 391, canvas 151, config 38, protocol 25 — 605 pass, 0 fail.
Lint, typecheck and `check:size` green; the gallery routes moved to
`api/gallery.ts`.

## Follow-ups

- None of it is device-verified.
- "Find it in the chat" scrolls to the message but does not highlight it.
- A deleted portrait leaves its file in object storage.
