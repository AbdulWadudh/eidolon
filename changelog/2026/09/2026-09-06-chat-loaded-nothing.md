# Why a week-old conversation showed an empty stage

**Date:** 2026-09-06
**Scope:** apps/canvas, packages/config

## What changed

Opening a chat sometimes showed "The stage is set" on a conversation with a
dozen messages in it. The conductor was never at fault: `GET
/characters/ines-vaz/messages` returned all twelve throughout, and her mood was
on screen the whole time — drawn from the same response that carried the
messages.

Two places set which character the store is holding, and only one of them
cleared what it was holding.

`useChatSocket` claims the id on mount. `loadHistory` fetches, and then kept the
longer of the held list and the fetched one — right for a reply that lands
mid-fetch, and read as "same character" here because the id had already been
claimed. So the previous character's messages survived. The screen filters by
id, so all of them were dropped, and an empty list is an empty stage.

It only broke when the character you arrived from had **more** messages than the
one you opened, which is what made it look intermittent. From Char-123 (37) to
Ines (12) it failed every time; from E2e-stage6 (1) it never did.

`setActiveCharacter` now changes the store's identity and its contents together.

Three other things came out of the same hunt:

- **A failed transcript fetch was silent.** `lastError` is set in four places
  and rendered in none. Combined with the projection, which only shows a screen
  the store once the store admits to holding its character, a failure left a
  placeholder up for good. `loadHistory` now binds the character before the
  fetch rather than after it, so a screen owns its own loading and its own
  failure.
- **A slow fetch could lose to a fast one.** Two are in flight whenever a reader
  moves quickly, and the slower one used to overwrite whatever was on screen.
  A response for a character the store is no longer holding is now dropped.
- **The transcript read had a six second timeout**, the same as a status check.
  Long enough for a short history and not for a long one, which is its own way
  of looking random. It is twenty now.

## Why

The invariant worth naming: the store's `activeCharacterId` and its `messages`
describe the same conversation, so nothing may change one without the other.
Both bugs above were that invariant broken in a different place.

## Evidence

The regression test is the reported case, and it was checked against the old
code before being kept: restoring the previous `setActiveCharacter` fails
`shows the new character's messages, not nothing` and `leaves nothing of the
last character behind`, and passes again once restored.

One existing test had to change. It fed a message and then claimed the
character, which cannot happen — a screen claims its character on mount and
messages arrive afterwards. Reordered rather than the store weakened.

Suites: conductor 398, canvas 159, config 38, protocol 25 — 620 pass, 0 fail.

## Follow-ups

- `lastError` is now cleared and set correctly but still has nowhere to appear.
  A failed load ends on the empty stage rather than on an explanation and a
  retry, which is better than a stuck placeholder and not yet right.
