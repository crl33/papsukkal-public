---
date: 2026-08-28
area: tooling
outcome: kept
---

# The mask bug that looked like broken geometry

## Why

V2's first generated masks came out empty-ish and mislocated: the cutout had
zero visible alpha, the plate was untouched, and the mask's content sat in the
bottom third of the frame.

## What was changed

Nothing was wrong with the mask logic. `sharp` **silently promotes a 1-channel
raw buffer to 3 channels** through `.blur()` and `.resize()`. Downstream code
indexed the returned buffer with a stride of 1, so it read interleaved RGB and
produced garbage offset down the image.

Fix: always read raw buffers back with `toBuffer({ resolveWithObject: true })`
and de-interleave by `info.channels`. Centralised as a `toPlane()` helper in
`tools/prepare-assets.mjs`.

## Result

Kept.

## What the next agent should know

Any new `sharp` raw round-trip in the asset pipeline must go through
`toPlane()`. This bug is invisible in code review and produces output that looks
like a geometry or coordinate error, which is where the debugging time goes.
