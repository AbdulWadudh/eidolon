# Media previews where a URL was just text

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config

## What changed

- `lib/media-kind.ts` reads a value and answers `image`, `audio` or `text`.
- `MediaPreview` renders accordingly: a bounded image, a play/pause button, or
  the text it always showed.
- A queue job's **output** and its read-only **input** fields use it, so a
  finished upload shows the picture it produced rather than a signed URL.
- The storage screen previews **every orphan before you delete it**, built from
  the bucket's `publicUrl`.
- `MEDIA_PREVIEW` in config carries the extension lists and sizes.

## Why

**A job's output was the most useful thing on the screen and the least readable.**
`upload-image` returns an S3 URL; `upload-audio` returns an MP3 URL. Both were
rendered as a truncated string, so the one thing you open a job to check — did it
actually produce the right file — needed copying the URL into a browser.

**The extension is read from the path, not the whole value.** A signed S3 URL
carries `?X-Amz-Signature=…`, and a naive `endsWith(".mp3")` fails on every one
of them. `pathOf` drops the fragment, then the query, then lowercases. There are
tests for exactly that, because it is the case that will actually occur.

**A bare filename is deliberately not previewed.** `turn.m4a` appears as a job
field (`TRANSCRIBE.filename`) and is not fetchable; treating it as audio would
render a play button that can only fail. Previewing requires the value to look
like a URL — `http(s)://` or root-relative — *and* have a known extension.

**The storage preview is the one that earns its place.** That screen deletes
things permanently. Seeing that the fourteen orphans are three test portraits and
eleven voice notes, rather than fourteen opaque keys, is the difference between
sweeping confidently and not sweeping at all. The conductor now returns
`publicUrl` alongside `endpoint` and `bucket`, because the endpoint the conductor
reaches the bucket on is not always the one a phone can.

Both previews fail soft: a broken image or an unplayable URL falls back to the
text, rather than leaving a dead control on screen.

## Evidence

`bun run lint` clean over 473 files. `bun run typecheck` green across five
packages.

`apps/canvas`: **249 pass, 0 fail** — 9 new in `tests/media-kind.test.ts`.
`apps/conductor`: **642 pass, 0 fail**. `packages/config`: **46 pass, 0 fail**.

The tests cover signed URLs with a query and a fragment, uppercase extensions,
root-relative paths, a bare filename staying text, and a URL with no known
extension staying text.

**On-device behaviour is unverified.** No handset was attached. Neither the image
sizing nor the audio playback has been seen working against the real bucket.

## Follow-ups

- Audio has no scrubber or duration, only play and pause.
- Images are bounded to `MEDIA_PREVIEW.imageHeightPx` with no way to open one
  full screen, though `GalleryViewer` already exists and could take them.
- There is no copy-to-clipboard for a URL. `UI_MS.copyFeedback` has been sitting
  in config unused since before this work, and copying needs a dependency the
  project does not have.
