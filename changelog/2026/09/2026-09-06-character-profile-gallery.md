# A profile page, and everywhere the pictures went

**Date:** 2026-09-06
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

Every character now has a profile page at `/characters/:id`: her portrait as a
hero, her name and either her tagline or her affinity tier depending on Insight
Mode, how many pictures and messages you have between you, a way straight into
the chat, and below that every image ever generated for her.

Tapping a thumbnail opens a full-screen browser you swipe through, with a
counter, the caption she wrote for that photo, and a save-to-device button.

Two ways in: the ⋯ on a roster card, which until now just opened the chat and
did nothing a plain tap did not already do; and her name in the chat top bar.
The avatar in the top bar still opens the framing editor, which is a different
job.

Server side, `GET /api/v1/characters/:id/gallery?limit&offset` returns
`{ images, total }`. Images are gathered from three places that had never been
read together — `messages.image_url` for chat photos, `characters.avatar_url` and
`face_url` for her portrait, and `stages.backdrop_url` for backdrops — each
tagged with a `kind` so the grid can mark the ones that are not chat photos.

## Why

The images already existed; nothing but the chat scrollback could reach them, so
a photo from three weeks ago was effectively gone. This adds no new storage and
no new generation — it is a read over what was already there.

The three sources are combined in SQL rather than in TypeScript so that `LIMIT`
and `OFFSET` apply to the merged, sorted result. Paging three lists separately
in JS and interleaving them afterwards cannot page correctly.

`stages` has no `created_at` — it never did — so backdrops borrow the
character's, which puts them at the start of her history rather than at some
arbitrary point in it. A face that is the same file as the avatar is listed once.

The grid is laid out by hand rather than with `FlatList numColumns`, because the
profile page is already a scroll view and nesting a second vertical scroller
inside one breaks momentum on Android. The viewer derives its counter from the
scroll offset rather than from `onViewableItemsChanged`, which fires mid-swipe
and flickers between two numbers.

## Evidence

Live, against the running conductor:

```
nadia-kerr   total 3   photo, photo, portrait
cass-delaney total 4   photo, photo, photo
emma         total 2   portrait, portrait
?limit=1&offset=1  ->  the second photo, not the first
```

Nine new conductor tests in `tests/gallery.test.ts`: photos newest first, a
message with no picture ignored, portrait and backdrops included, an avatar that
is also the face listed once, one character's pictures kept out of another's,
paging that neither repeats nor skips, the HTTP page and true total, a greedy
`limit=99999` capped, and a character with nothing answering 200 rather than
failing. Five canvas tests cover the page merge and the URL.

Suites: conductor 358, canvas 146, config 38, protocol 25 — 567 pass, 0 fail.
Lint, typecheck and `check:size` green.

## Follow-ups

- Not device-verified. The APK at `8a6b993` predates all of it.
- The `kind` tag is returned and shown as a corner badge but nothing filters on
  it yet; the copy for All / Photos / Portrait / Backdrops chips exists unused.
- Deleting a picture from the gallery is not possible; the chat viewer can.
