---
updated: 2026-08-29
commit: 0b26008
---

# Where it stands

## V1 — procedural (the active surface)

Working, 60 fps, ~690 simulated plants. All gates green: 64 unit tests, 8 e2e,
production build clean, sim stable and bounded at t=600 s.

Recent art-direction pass delivered: oblique cupped hero flowers with a real
petal material (underside, transmission, specular); elongated oblique foreground
masses; background reduced from stage-light blobs to discrete botanical bokeh;
the "wire forest" midground rebuilt as botanical tangle; red sprays rebuilt as
branching umbels.

Band luminance vs reference (`node scripts/measure.mjs`):

| Band | Reference | V1 now | Verdict |
|---|---|---|---|
| low | 26.8 | ~28 | matched |
| top | 71.6 | ~65 | close |
| mid | 54.5 | ~38–46 | **the open gap** |

All overlay typography has been removed — the page is artwork only.

## V2 — reference-driven

Working and stable, not the active surface. Zero-motion fidelity ≈2.17 mean
|diff| against the photograph (hard gate: <3.5). 13 moving layers, ghost /
coverage / margin gates passing, forced-pose probe clean in both directions.

## The frozen archive

Tag `v1-procedural` and branch `archive/v1-procedural` hold V1 as it was at the
redirection. The working V1 tree has since diverged — that is expected.

## Known limits

- The midground still reads sparser and darker than the reference (see above).
- `measure.mjs` band means are gameable; always pair with a silhouette gate.
- Four petal helpers in V1 `species.ts` are dead code, deliberately not deleted
  (see `../00-context/name-collisions.md`).
