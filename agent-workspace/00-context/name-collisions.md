# Name collisions — read this first

Product language and code names disagree in this repo. Stated once here so no
other file has to re-explain them.

| You will hear | In the code it is |
|---|---|
| "the breeze", "the wind" | TWO objects, always: `WindField` (the airflow) + `PlantSim` (how one plant answers it). A change to "the wind" usually means one of them, not both. |
| "V1", "the procedural one" | `versions/v1-procedural/` |
| "V2", "the photo one" | `versions/v2-reference-driven/` |
| "the reference" | V1: `dev-assets/reference.jpg` — gitignored, art direction only. V2: `public/reference/reference.jpg` — committed, and it IS the artwork. Same image, opposite roles. |
| "DOF" | V1 only: `CinematicDofPass`. V2 has **no** runtime DOF. |
| "hero" | a `Placement` with `focusRole: "hero"` — not "any large flower" |
| "the plate" | V2's inpainted background: `public/reference/layers/plate.jpg` |
| "cutout" vs "patch" | V2: the **cutout** moves (the flower). The **patch** never moves (the true background around it). Confusing these is how ghosting gets reintroduced. |
| "frozen V1" | the git tag `v1-procedural` and branch `archive/v1-procedural`. The working tree at `versions/v1-procedural/` is **not** frozen and has diverged. |
| "the gates" | two unrelated things: **visual** gates (`../20-visual-gates/`) and **test** gates (`npm test` / `test:e2e`). Ask which. |

## Universes

Some code is present but not on the main path. Where a card says so, believe it:

- **live** — in force. Cite and change these.
- **leftover** — still present, superseded. Touch only if that path is in scope.
- **ghost** — named but wired to nothing. Do not implement against these.

Currently `leftover`: four petal helpers in V1's `species.ts`
(`addPetalRing`, `addIrregularPetals`, `addNaturalCenter`, `addCenterDome`) —
zero references anywhere. See `codebase-map/repo/retired-petal-builders.md`.
