# The photo sheet reads like the others

**Date:** 2026-09-16
**Scope:** apps/canvas, packages/config

## What changed

- The reroll moved from beside the send button to the title row, where the ideas
  it regenerates are.
- A close button, matching every other sheet: `Cancel01Icon`, `hitSlop={12}`,
  a hairline circle.
- The description field is a single-line `Input` across the full width with the
  author actions trailing, and the send is a full-width `Button` beneath it —
  the same two components `OutfitSheet` uses.
- `DownloadButton` moved out of `MediaPreview` into its own module.

## Why

**The reroll acts on the chips, not on the field.** Sitting in a row with send it
read as a second submit, and it took width the description needed.

**`PhotoRequestSheet` was the only sheet a person could not close.** Tapping the
backdrop worked and nothing said so.

**A two-line field for a phrase.** The field takes a short description of a
photo. As a textarea it could not submit from the keyboard; as an `Input` it
gets `returnKeyType="send"`.

**`MediaPreview` imported `ImageLightbox`, which imported `DownloadButton` back
out of `MediaPreview`.** Metro warned about the cycle on every bundle, and a
cycle leaves one module's bindings uninitialised: the app was dying on
`ReferenceError: Property 'MIND_COPY' doesn't exist`, which `ImageLightbox`
reads. Extracting the shared button breaks it.

## Evidence

canvas 307 pass, typecheck and biome clean, `check:size` clean.

A scan of every `@/` import in `apps/canvas` after the change reports no cycles
at all.

Four strings moved into `PHOTO_COPY` rather than staying inline, because they
became visible text: the button label and the placeholder, each with a variant
for taking a photo again.

Not verified on a device. Tests and typecheck only.
