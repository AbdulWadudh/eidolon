# Back reaches the roster, the pager stops eating pinches, and the fields move off the edge

**Date:** 2026-09-06
**Scope:** apps/canvas

## What changed

**Back from a chat now reaches the roster**, not the profile or gallery the
reader passed through to get there. A profile is a detail of a conversation, not
a step on the way to one, so opening a chat from it either returns to the chat
already below or takes the profile's place. Going the other way — a chat to a
profile — is still a plain push, because back from a profile should return to the
conversation you were reading.

The decision is `openMode` in `lib/stack-nav.ts` rather than a `push` or a
`dismissTo` chosen per call site, because it depends on what is already in the
stack and that is the part worth testing.

**Pinch to zoom works.** It failed for a third reason after the modal's gesture
root and the worklet callbacks: the list's own scroll claimed the touch first,
so the pinch never activated. The pager's scroll is a named `Gesture.Native()`
now, and the pinch and pan declare that they may run alongside it.

**The settings fields sat against the edge of the screen.** Horizontal padding
was on the ScrollView's frame; on React Native that inset does not travel with
the scrolled content. It is on `contentContainerStyle` now, at the same 20px the
create screen already used.

## Why

Three separate mechanisms had to be right before a pinch reached the image, and
each one hid the next: gesture handlers do not cross a `Modal` boundary, gesture
callbacks that are not worklets run a frame at a time on the JS thread, and a
scrollable ancestor wins the touch unless simultaneity is declared. Fixing one
at a time looked like no progress until the last.

`openMode` ignores the last route in the stack deliberately: that is the screen
doing the asking, and opening the chat you are already on must not read as
"already below".

## Evidence

Twelve new canvas tests. Seven on `openMode`: the profile is replaced when the
chat is not already open, the chat below is returned to when it is, another
character's chat is not mistaken for this one, the asking screen is never
counted, and an empty stack is safe. Five on `trackLiveEdge`, from the same
session.

Suites: conductor 398, canvas 156, config 38, protocol 25 — 617 pass, 0 fail.
Lint, typecheck and `check:size` green.

## Follow-ups

- Zoom is still not device-verified. Three causes have been found and fixed by
  reasoning about what blocks a gesture; whether a pinch now moves the picture
  can only be answered on hardware.
- The phone button removed earlier is still absent; voice call remains listed as
  "Soon" under the + menu.
