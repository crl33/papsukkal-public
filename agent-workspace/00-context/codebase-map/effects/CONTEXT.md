# Change-impact — open these before you edit

One job: route by the CHANGE you were asked to make, not by the file you
guessed at. This is a catalog. It names cards; it does not repeat them. If this
file and a card disagree, the card is right — fix this file.

## Inputs

- Reference (every walk): `../objects/_index.md`
- Working (this task): whichever cards the row below names

## If you are changing…

| The change | Open these, in order | Watch out for |
|---|---|---|
| **How a flower looks** (colour, veins, petal shape) | `../objects/v1-scene/petal-atlas.md` → `../objects/v1-scene/species-builders.md` | The atlas colours a whole species at once. Silhouette lives in the painted alpha, not the mesh. |
| **A flower's pose / orientation** | `../objects/v1-scene/composition.md` → `../objects/v1-scene/species-builders.md` | `facing` is tunable; `screen` position is FROZEN by product decision. |
| **Where a flower sits on screen** | `../objects/v1-scene/composition.md` → `../objects/v1-scene/locked-camera.md` | Hero placements are frozen. If you were not explicitly told to move one, you were not. |
| **The camera** (FOV, height, focus distance) | `../objects/v1-scene/locked-camera.md` → `../objects/v1-scene/composition.md` → `../objects/v1-scene/cinematic-dof.md` | Every placement is projected through the camera. Changing it moves the entire composition at once. |
| **Blur, bokeh, focal falloff** | `../objects/v1-scene/cinematic-dof.md` → `../objects/v1-scene/locked-camera.md` | Near field and far field are separate paths. Foreground bleed into the midground is a near-field composite bug, not a blur-radius problem. |
| **Overall mood, contrast, saturation** | `../objects/v1-scene/colour-grade.md` → `../objects/v1-scene/environment.md` | The grade is global. Band luminance is usually an environment/atmosphere problem, not a grade problem — measure before grading (`../processes/compare-against-reference.md`). |
| **How plants move** | `../objects/wind/wind-field.md` → `../objects/wind/plant-oscillator.md` | **Both versions carry their own copy.** Changing V1's wind does not change V2's. That is deliberate. |
| **Deformation of geometry under wind** | `../objects/v1-scene/vegetation-material.md` → `../objects/v1-scene/geometry-builder.md` | One shader moves every plant. The `aData` attribute contract is what makes roots stay put — break it and plants slide. |
| **Adding a species** | `../objects/v1-scene/species-builders.md` → `../objects/v1-scene/petal-atlas.md` → `../objects/v1-scene/composition.md` → `../objects/v1-scene/meadow-scene.md` | Four files, in that order. A species with no atlas entry renders untextured. |
| **Density / how full the meadow is** | `../objects/v1-scene/meadow-scene.md` → `../objects/v1-scene/composition.md` | Scatter zones, not counts, control where things land. |
| **Frame rate / device scaling** | `../objects/v1-scene/quality-tiers.md` → `../objects/v1-scene/v1-app.md` | Tiers may scale pixels and density. They may never scale the hero composition. |
| **V2: which parts of the photo move** | `../objects/v2-layers/layer-manifest.md` → `../objects/v2-layers/mask-specs.md` → `../processes/prepare-assets.md` | Manifest rects and mask rects must match exactly (a unit test pins this). Changing a mask means **re-running the asset build**. |
| **V2: ghosting, halos, background dragged along** | `../objects/v2-layers/mask-specs.md` → `../processes/prepare-assets.md` → `../objects/v2-layers/layer-mesh.md` | Almost always a decomposition problem, not an animation problem. The tight/patch split and the margin > clamp invariant are the two things to check. |
| **V2: how far things move** | `../objects/v2-layers/layer-mesh.md` → `../objects/v2-layers/layer-manifest.md` | The displacement clamp must stay below the plate's reconstruction margin. Raising one without the other reveals un-inpainted pixels. |
| **Anything, in both versions at once** | `../objects/repo/version-separation.md` | Stop. Sharing code across versions is a contract violation, not a refactor. Copy with provenance or do it twice. |

## What points INTO this tree from outside

The walk test cannot see these — nothing in the tree references them, so no card
names them unless we go looking. Verified 2026-08-29:

| Consumer | What it hardcodes | Breaks if |
|---|---|---|
| `.claude/launch.json` | ports 5183 / 5193, npm script names `dev:v1` / `dev:v2` | ports or root script names change |
| root `package.json` scripts | the literal paths `versions/v1-procedural`, `versions/v2-reference-driven` | either version folder is renamed |
| each version's `playwright.config.ts` | its own port and `npm run dev` | the version's vite port changes |
| `scripts/sync-twins.mjs` | `CLAUDE.md` and `agent-workspace/CLAUDE.md` | either entry file is renamed or moved |
| `versions/v1-procedural/scripts/silhouette.mjs` | `dev-assets/reference.jpg` (gitignored) | the reference photo is absent — supply it locally |
| `versions/v2-reference-driven/tools/masks.mjs` | `public/reference/reference.jpg` and pixel coordinates of the 1242×822 source | the reference image is replaced or resized |
| git tag `v1-procedural`, branch `archive/v1-procedural` | the frozen V1 snapshot | never — these are immutable by decision |

## Human check

After a change, run the gates named in `../objects/pipeline/dev-gates.md` for
the version you touched, and update any card whose claims you invalidated.
