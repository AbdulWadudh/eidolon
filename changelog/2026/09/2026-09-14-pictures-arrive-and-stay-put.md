# Pictures arrive, and stay the shape they were drawn

**Date:** 2026-09-14
**Scope:** apps/canvas, apps/conductor

## What changed

- `GET /characters/:id/look` **exists**. It never did — only the PATCH.
- Setting an avatar **clears its crop**.
- A studio stops waiting when the picture changes, **whichever** of the three
  routes noticed, and gives up after three minutes.
- A portrait prompt names each feature: `sharp jawline face, dark hazel eyes`
  rather than `sharp jawline, dark hazel`.
- Media is stored under the owner's email: `<email>/characters/<id>/images/…`.
- A persona picture is uploaded as base64 rather than multipart.

## Why

**The polling could never have worked.** `fetchLook` calls
`GET /characters/:id/look`, which answered 404 on every call it has ever made, so
the portrait studio's poll returned `null` for ever. Going back and returning
worked because the profile screen refetches the character by a different route.
Three separate attempts at the polling logic were spent on a call that could not
succeed — the endpoint should have been checked first.

**A crop describes the picture it was drawn on.** It is stored as ratios of that
image's width and height, and the avatar is drawn with `contentFit: "fill"`.
Replace the picture and keep the crop and those ratios now describe something
that is not there, so the new picture is stretched to fit the old numbers.

**A spinner had one way to stop and the picture had three ways to arrive.** The
poll, a refetch on focus, or a push from the conductor. Whenever one of the other
two won, the spinner turned over a picture that had already changed. Waiting is
read off the picture now.

**A hand-rolled prompt lost its nouns.** The portrait worker assembled the
description itself instead of using the composer the selfie and persona both use,
so features arrived as bare adjectives with no subject to attach to. A sharp
jawline and an athletic build with nothing named around them read masculine and
outweighed the two words of subject in front of them.
