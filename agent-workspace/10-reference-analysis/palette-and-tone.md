# Palette and tone — measured, not guessed

## Colour anchors

| Element | Hex |
|---|---|
| Foliage sage-teal | `#2a5f55`, `#3d7d6c`, light `#5aa88d` |
| Shadow navy | `#0a1f2e`, near-black `#06121f` |
| Magenta petals | `#bc1a80` core, `#e654ab` highlight, `#3d0824` throat |
| Violet | `#7a3bd4`, `#9b59e8` |
| Red | `#d81f2a`, crimson `#b3121f`, maroon `#5c0e14` |
| Cobalt | `#2244dd`, `#3a5bff` |
| Orange → yellow | `#ee7d0e` → `#ffc832` |
| White daisy | `#f2efe6`, centre `#e8b820` |
| Cyan bokeh | `#2a7fa0`, `#3fa9c9` |

Rules: foliage is **sage-teal, never grass green**; shadows sink to near-black
navy, never grey; the teal-vs-magenta/orange tension is the identity of the
image. No neon, no bloom halos, no clipped highlights.

## Band luminance — the numbers that matter

Measured with `node scripts/measure.mjs` (V1). Mean luminance, 0–255:

| Band (screen rows) | Reference | Why it matters |
|---|---|---|
| top (0–250) | **71.6** (p95 137, teal 2.1%) | bright, the cyan sky-gap lives here |
| mid (300–640, x 40–700) | **54.5** (p50 54.5, p95 110, teal 13.1%) | the luminous botanical mass |
| low (640–822) | **26.8** (p50 22.8, teal 3.7%) | dark. The foreground is deep, not lit |

The shape is a **vertical luminance ramp**: dark soil → luminous meadow →
bright sky. Getting this ramp right matters more than any individual element.

## The lesson these numbers taught

An early render had a midground of mean 23 against the reference's 54.5. The
stems looked like "high-contrast wire" — but the stems were not too bright, the
*background between them was too dark*. The fix was lifting and filling the
midground, not darkening the stems. Measure the band before you touch the thing
you think is wrong. See `../30-experiments/2026-08-29-wire-forest.md`.
