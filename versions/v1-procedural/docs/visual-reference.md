# Visual Reference Decomposition

The master reference is a low-angle, close-focus floral photograph of a wildflower
meadow with an extremely shallow depth of field and a deliberately surreal
teal/magenta/orange grade. The photograph itself is authoritative; this document
records the measurements and decisions derived from it.

> The reference photograph is **not** committed to this public repository
> (unknown license). For the dev comparison overlay, drag & drop the image
> onto the running dev page (it persists in localStorage); optionally keep a
> copy in `dev-assets/` (gitignored) — see `docs/dev-workflow.md`.

Image aspect ratio: ~1.51:1 (≈1242×822). All coordinates below are normalized
(x: 0 = left → 1 = right, y: 0 = top → 1 = bottom).

## 1. Optical structure

Three depth regimes define the image:

| Regime | Depth (est., camera-relative) | Blur |
| --- | --- | --- |
| Extreme foreground | 0.15–0.5 m | Massive — flowers dissolve into soft colored masses |
| Focus plane (midground) | ~1.0–1.6 m | Razor thin; only a narrow band is sharp |
| Background | 2.5–8 m+ | Progressive collapse into large bokeh discs |

Lens character: reads like an ~85–135 mm-equivalent at ~f/2 focused ≈1.2 m away,
camera held at flower-head height (~0.5 m above soil), pitch essentially level
with a very slight upward tilt. Perspective compression is moderate; vertical
FOV is narrow (≈20–25°).

Bokeh: large, smooth, mostly circular discs. Defocused background poppies
render as red rings with dark centers. Foreground defocus is even creamier
than background defocus.

## 2. Focus-plane subjects (heroes)

| Subject | Center (x, y) | Size (Ø / width frac.) | Notes |
| --- | --- | --- | --- |
| Large magenta cosmos | (0.25, 0.30) | 0.17 | Sharpest subject. Dark navy center disc ringed by yellow-orange stamens. Petals magenta→purple with darker radial striations. Head tilted toward camera-left, seen slightly from below. |
| Second magenta cosmos | (0.47, 0.375) | 0.10 | Sharp, yellow-orange center, face turned up-right. |
| White daisy | (0.54, 0.335) | 0.045 | Small, crisp, yellow center. |
| White daisies (pair) | (0.635, 0.445), (0.615, 0.50) | 0.03 | Slightly softer. |
| Orange daisy (upper right) | (0.83, 0.27) | 0.10 | Near-sharp; dark navy center, orange petals with yellow gradient at base. |
| Orange daisy (lower right) | (0.875, 0.60) | 0.09 | Dark center, slightly behind focus. |
| Yellow-orange daisy (right, edge-on) | (0.72, 0.41) | 0.09 | Seen almost edge-on pointing left; slightly soft. |
| Red micro-cluster flowers | (0.34, 0.50) main, spread (0.28–0.44, 0.45–0.65) | each ~0.012 | Tiny clustered scarlet blooms on wiry stems; near focus. |
| Cobalt blue micro-flowers | cluster (0.05–0.30, 0.55–0.90) | each ~0.015 | Saturated cobalt w/ violet tint; some near-sharp at (0.26, 0.72), most softer. |
| Teal buds (poppy-like) | (0.50, 0.16) pair; (0.35, 0.11); (0.62, 0.30) | ~0.02 | Unopened rounded buds on thin stems, punctuating the upper midground. |
| Dark red-maroon layered bloom | (0.42, 0.20) | 0.13 | Carnation/rose-like, semi-soft, just behind focus plane. |

## 3. Extreme foreground masses (essential framing, heavily defocused)

| Mass | Center (x, y) | Size | Color |
| --- | --- | --- | --- |
| Red-magenta blob | (0.23, 0.56) | 0.18 | Saturated crimson-magenta |
| Red-magenta blob | (0.10, 0.83) | 0.22 | Crimson |
| Large crimson mass | (0.58, 0.79) | 0.24 | Deep red, warm core |
| Yellow-orange masses | (0.80, 0.85), (0.93, 0.63) | 0.15–0.2 | Warm yellow→orange |
| Violet soft cluster | (0.44, 0.79), (0.51, 0.93) | 0.10 | Blue-violet |
| Pink blobs, left edge | (0.02, 0.21) | 0.10 | Soft pink-magenta |

These are real out-of-focus flowers near the lens — not vignettes. They must be
actual depth-positioned geometry so wind changes their silhouettes/bokeh.

## 4. Background bokeh field

- Defocused red poppies (ring + dark center): (0.68, 0.09), (0.80, 0.05), (0.86, 0.15), (0.97, 0.02).
- Dark maroon blurred blooms upper-left: (0.06, 0.10), (0.02, 0.04).
- Soft red glow top-center: (0.37, 0.06), (0.44, 0.04).
- Orange blurred flower clipping top-right corner: (0.95, 0.22).
- Magenta/violet blobs right edge: (0.93, 0.35), (0.93, 0.47).
- Cyan/azure "sky-gap" bokeh patches: (0.55–0.75, 0.02–0.15), brightest ~(0.58, 0.06).
- Everything else: deep navy-teal wash, darkening toward corners.

## 5. Palette (sampled/estimated)

| Element | Hex anchors |
| --- | --- |
| Foliage teal | `#1b5f63`, `#2a7d7a`, light `#3fa08e` |
| Shadow navy | `#0a1f2e`, near-black `#06121f` |
| Magenta petals | `#c2258f` core, `#e04fb0` highlight, `#8e1766` striations |
| Violet | `#7a3bd4`, `#9b59e8` |
| Red | `#d81f2a`, crimson `#b3121f`, maroon `#5c0e14` |
| Cobalt | `#2244dd`, `#3a5bff`, violet-blue `#5b45e0` |
| Orange→yellow | `#f5941e` → `#ffc832` |
| White daisy | `#f2efe6`, center `#e8b820` |
| Cyan bokeh | `#2a7fa0`, `#3fa9c9` |

Non-negotiable color rules:

- Foliage/stems are **teal/cyan-green**, never grass green.
- Shadows sink to near-black navy, not gray.
- The teal-vs-magenta/orange complementary tension is the identity of the image.
- Light is diffuse and slightly cool; petals have soft top light, no speculars.
- No neon glow, no bloom halos, no HDR clipping. Filmic tone mapping, gentle
  highlight rolloff, saturation held high but not clipped.

## 6. Contrast & light distribution

- Brightest regions: cyan sky-gap bokeh (top center-right), white daisies,
  yellow/orange petals lower-right.
- Darkest: top-left maroon corner, bottom-center foliage shadow, navy centers
  of the daisies.
- Light direction: soft top/top-left; effectively overcast with a slight
  backlit rim feel on the upper stems and buds.
- A natural vignette: all four corners fall off into darkness or heavy blur.

## 7. Density & depth transition

- Visual density is high but the *sharp* population is small: ~8–10 readable
  flowers. Everything else is soft.
- Depth transition is fast: elements just 0.3 m off the focus plane are already
  clearly soft; 1 m off they are pure bokeh.
- Stems: thin, wiry, teal; visible mostly within ±0.5 m of the focus plane.
  Cosmos-like feathery micro-leaves; sparse, not turf.

## 8. Implementation decisions derived from the above

1. **Camera locked** at ~0.5 m height, level pitch, vertical FOV ≈ 22°,
   focus distance ≈ 1.2 m in world units (1 unit = 1 m).
2. **Depth bands** (world z, camera at origin looking −z):
   foreground −0.2…−0.6, focus −1.0…−1.6, near-bg −2…−3.5, deep bg −4…−9.
3. Hero flowers positioned deterministically from `src/config/composition.ts`
   mapping the normalized (x, y) table above into world space through the
   locked camera (so the rendered frame matches the photo layout by
   construction).
4. Depth of field is a real post-process reading the depth buffer
   (circle-of-confusion based, `CinematicDofPass`): a ±0.12 m dead zone
   around the focus plane, then blur ramping on a saturating `|d−f|/d`
   curve — background discs at −4 m and the extreme foreground both reach
   the pyramid's widest blur level.
5. Background poppies/bokeh sources are cheap billboards with real depth —
   the DOF turns them into authentic discs/rings.
6. Foreground masses are real low-poly flower blobs at −0.25…−0.6 m attached
   to wind-driven stems, so their silhouettes breathe.
7. Grading: AgX/filmic base + teal-shifted shadows, magenta-protected
   saturation, gentle vignette — implemented as a custom post effect.

## 9. Floral art-direction v2 (reference reconstruction pass)

A second pass rebuilt the floral landscape against the photograph:

- **Painted petal cards**: heroes use `addTexturedPetals` — curved cards on a
  seeded painted atlas, so the organic silhouette comes from the artwork's
  alpha rather than the mesh outline. Per-petal pose keeps the irregularity
  (uneven length, jittered spacing, droop/lift/twist/tip-curl, staggered
  whorls, per-petal luminance); centres are `addTexturedCenter` domes with a
  physical stamen-bead ring (reads as a crescent under head tilt).
  (The earlier `addIrregularPetals` / `addNaturalCenter` path this section
  originally described is retired — see
  `agent-workspace/00-context/codebase-map/objects/repo/retired-petal-builders.md`.)
- **Density map**: filler vegetation (wiry branching stems, feathery
  filigree, floor tufts) is scattered by screen-space elliptical zones
  matching §7's distribution, never uniformly.
- **Background flower field**: generated clusters of petal-silhouette /
  poppy-ring / azure-disc impostors (`composition.bgField`) so the defocused
  field reads as *flowers*, not gradient fog. The DOF far field caps at the
  C pyramid level to keep those forms structured.
- **Micro-blooms**: red clusters are multi-lobed pom sprays with flat-lit
  scatter shading (soil-occlusion relief keyed to blossom flutter weight).
- The frame's bottom edge is sealed by defocused violet/blue/crimson masses
  (§3) — no sharp geometry touches the near frame boundary.
