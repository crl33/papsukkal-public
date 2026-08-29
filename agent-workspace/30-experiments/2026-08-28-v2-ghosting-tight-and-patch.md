---
date: 2026-08-28
area: v2-decomposition
outcome: kept
---

# V2 ghosting: one mask was never going to work

## Why

Two reported defects: moving flowers left residual petals behind (ghosts), and
they dragged the background around them as they swayed.

## What was changed

Root causes, in order of size:

1. **Chroma keying under-covered the flower.** A value gate deliberately
   excluded dark pixels, so dark petal bases and shadowed edges stayed in the
   plate — invisible at rest, ghost fragments the moment the flower moved.
2. **One mask did two jobs.** The same generous silhouette was both the moving
   cutout and the plate hole, so the cutout carried a disc of background with it.
3. **No motion margin.** The plate was inpainted exactly under the mask, so any
   sway beyond the feather revealed un-reconstructed pixels.

Fix: **two masks per unit.** A generous SILHOUETTE (plate hole + patch extent)
and a TIGHT flower-only mask (the moving cutout), with the **static patch** =
silhouette − dilated tight, drawn beneath the cutout and never moved. Plate
inpainting extended ~18 px beyond every silhouette; runtime displacement clamped
below that margin.

## Numbers

| Gate | Before | After | Target |
|---|---|---|---|
| F — zero-motion fidelity | 4.0 mean, 2.06% strong | **2.17 mean, 0.24% strong** | <3.5 / <0.4% |
| G — ghost / coverage / margin | n/a | passing | hard gate |

## Result

Kept. Forced-pose probe (every layer at maximum deflection, both directions)
shows static background and attached stems.

## What the next agent should know

The invariant that makes this safe is **margin > clamp**, and it is unit-tested.
If you raise the displacement clamp, raise `MOTION_MARGIN_PX` and regenerate
assets in the same change, or flowers will reveal un-inpainted pixels at the
extremes. Also: colour keying alone cannot extract a flower whose dark parts
matter — use a hand-authored silhouette and let chroma refine only the tight mask.
