# The real cause of the shared transcript, and a settings screen worth opening

**Date:** 2026-09-06
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

**Every character showed the same conversation.** The earlier fix to
`loadHistory` was not the bug. The screen rendered `chat.messages` — the whole
shared store — with no reference to which character it was for, and `router.push`
leaves the previous chat screen mounted underneath the new one. That screen never
re-ran its effect, so popping back to it re-rendered it with whoever was opened
last.

`projectChat(state, characterId)` now stands between the store and the screen. A
screen sees the store only while `activeCharacterId` is its own character, and
its messages are additionally filtered by the id they were stored with. History
reloads on focus rather than on mount, so popping back reclaims the store.

**The settings screen was rebuilt.** It is full screen rather than a bottom
sheet, and the nine fields are grouped into Identity / Mind / Voice / Sharing
behind a segmented control instead of one undifferentiated scroll. The header
carries a back control, the character's portrait and name, a dark-mode toggle and
a theme entry point. A save bar slides in only once something has actually
changed, counts the changes, and offers a discard beside the save.

**The theme studio opened from a character now edits that character.** It used
to open in global scope with a collapsed picker, so changing one character's
colour meant opening "Applies to", switching off "everyone", and only then
choosing a colour. Passed `lockToCharacter`, the studio starts in character scope
and drops the scope selector entirely.

**Ownership is now the server's answer, not a guess.** `GET /characters/:id`
returns `isMine`, so the header can say "Yours" or "Written by somebody else"
truthfully, the fork warning appears only when saving would really fork, and the
publish switch is disabled rather than failing with a 403.

## Why

The chat-switching symptom was reported twice. The first fix was aimed at the
data layer, and the data layer was already correct — the conductor stores and
serves per character (`nadia-kerr` 14 messages, `char-123` 20, `cass-delaney` 2,
`emma` 0, all distinct over HTTP). Checking that first this time is what pointed
at the render path.

The projection is a pure function rather than a selector because it builds a new
object per call, and a zustand selector that never returns a stable reference
re-renders without end.

The segment pill is absolutely positioned and childless, which is the one case
where animating width and offset costs no layout pass on its siblings and keeps
the corner radius a `scaleX` would smear. The section body crossfades rather than
sliding: the four sections are peers, and sliding would imply a depth that is not
there.

## Evidence

```
GET /characters/emma                      isMine=false  owner=AYn6sCfp...
GET /characters/emma       (device token) isMine=true
GET /characters/nadia-kerr (device token) isMine=true   owner=null   (adoptable)
```

Suites: conductor 348, canvas 136, config 38, protocol 25 — 547 pass, 0 fail.
Six new canvas tests in `tests/chat-view.test.ts` cover the actual bug: a screen
mounted underneath another shows nothing, borrows no stream, draft, mind, avatar
or backdrop, gets its conversation back when reopened, and drops a message
stamped with somebody else's id. One new conductor test covers `isMine` across
owned, someone else's, unclaimed and anonymous.

`ThemeStudioSheet.tsx` was 736 lines of known debt and the scope work would have
grown it; the selector moved to `ThemeScopeSelector.tsx` and it is 708 now.
`chat/[id].tsx` hit 302, so the reply tray's behaviour moved to
`hooks/use-suggestions.ts`.

## Follow-ups

- Still not device-verified. The APK at `8a6b993` predates all of it.
- The chat top bar shows `capitalize(characterId)` — "Nadia-kerr" rather than
  "Nadia Kerr". The transcript response carries the real name and it is dropped.
- `greeting` is stored and reaches nothing.
- The roster's ⋯ button still just opens the chat.
