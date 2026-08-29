# Optics — the depth structure

The single most defining property of the reference. Get this wrong and no amount
of botanical detail will help.

## Three regimes

| Regime | Distance (V1 world units ≈ metres) | Character |
|---|---|---|
| Extreme foreground | 0.3–0.6 | Enormous, unrecognisable colour smears. Cropped by the frame edges. Creamier than the background. |
| Focus plane | ~1.0–1.6 | Razor thin. Only a narrow band is genuinely sharp. |
| Background | 2.5–8+ | Progressive collapse into bokeh that still reads as *flowers*, not discs. |

Lens character: reads like ~85–135 mm at ~f/2, focused ≈1.2 m, camera at flower
height (~0.5 m), essentially level.

## The three rules that follow

1. **Foreground defocus is creamier than background defocus.** Real lenses do
   this. In V1 the widest blur level is reserved for the near field.
2. **Background bokeh keeps structure.** Distant flowers must still read as
   flowers — ring-shaped defocused poppies, petal silhouettes. Fog is wrong.
   V1 caps the far field at a mid pyramid level for exactly this reason.
3. **A defocused foreground occludes but never tints.** If the big red near-field
   mass is bleeding colour onto the sharp midground stems, that is a compositing
   bug, not a blur-radius problem. (This was a real defect; see
   `../40-decisions/0004-dof-near-field-is-a-scatter-layer.md`.)

## Foreground shape — not circles

The near masses are flower heads inches from the lens seen at strongly oblique
angles: **elongated, irregular, often near-horizontal, partly outside the
frame**. A round colour blob is the classic failure. Build coarse 3D heads at
near-edge-on pitch and let the DOF do the work.

## Hero flowers are oblique, not frontal

The large magenta cosmos is a shallow **bowl seen from slightly below and the
side**: roughly 2:1 wider than tall, near-petal undersides forming a dark rim
arc, far petals standing up around the cup, and the receptacle a foreshortened
dark wedge low in the flower. A frontal radial disc is the classic failure.
Measured with `silhouette.mjs hero` (see `../20-visual-gates/`).
