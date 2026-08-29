---
type: process
cluster: pipeline
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/scripts/shots.mjs
consumes: [running V1 dev server (:5183), dev-assets/reference.jpg (local, gitignored)]
produces: [shots/ref-aspect.png, shots/silhouette/<region>/{pair,gray,edges,mass}.png, band statistics on stdout]
---

# compare-against-reference — the V1 art-direction loop

How a V1 look change is judged: freeze the simulation deterministically, capture the reference-aspect frame, then compare that PNG against `dev-assets/reference.jpg` by region silhouette and by band statistics. Bare filenames below live under `versions/v1-procedural/`; `.gitignore` is the repo root's, the only one in the repo.

## Input → Movement → Output

In: whatever you just changed — a placement in `composition.ts`, a DOF curve, a grade uniform. Movement: Playwright loads the page in deterministic mode so the wind pose and the grain are pinned, screenshots at exactly 1242×822, and two sharp scripts crop the same rectangles out of both images. Out: side-by-side / desaturated / blurred / edge-overlay plates you look at, plus five numbers per band you read.

## Why this shape

The reference photograph is not in the repo (repo-root `.gitignore:4`) and never can be, so V1's look has **no committed baseline and no automated gate** — this loop is the gate, and it is human-judged. That forces two things. Determinism, so successive captures differ only by your edit: `?det=1&t=` pins sim time and grain (`App.ts:45`, `App.ts:86`, `composer.ts:88`). And *comparison by region and by statistic rather than by pixel*: V1 synthesises its own flowers, so they are not where the photograph's flowers are. A whole-frame pixel diff would be noise. What must actually match is silhouette mass, edge distribution, and per-band luminance and teal fraction.

## Steps

1. Dev server on 5183 (`vite.config.ts:6`), which is `shots.mjs`'s default `--url` (`shots.mjs:17`).
2. `npm run shots -- --only ref-aspect` — captures the 1242×822 reference aspect only (`shots.mjs:24`, `shots.mjs:33`), navigating `?det=1&t=6` and waiting on `__papsukkalReady` (`shots.mjs:44`). Writes `shots/ref-aspect.png` (`shots.mjs:47`). Any console error fails the capture with exit 1 (`shots.mjs:53`). Drop `--only` before shipping a framing change: the full matrix is seven viewports down to 390×844 (`shots.mjs:23`).
3. `node scripts/silhouette.mjs <region>` (`--list` for names; regions are rectangles in *reference* pixels — `silhouette.mjs:25`). Four plates: `pair.png` raw side-by-side; `gray.png` desaturated + normalised, which is the value-structure check with hue removed (`silhouette.mjs:70`); `mass.png` both blurred by `w/22`, the squint test for broad colour mass (`silhouette.mjs:76`); `edges.png` gradient magnitude thresholded at 42, reference in magenta over render in green — white where the linework agrees (`silhouette.mjs:82`).
4. `node scripts/measure.mjs` — the numeric half. Three bands (`mid`, `low`, `top` — `measure.mjs:5`), printing `tealPct` (its own green test: `g > 58 && g > r*1.5 && g > b*1.02`, `measure.mjs:22`), `meanLum`, `p50`, `p95`, `maxLum` for reference and render side by side (`measure.mjs:34`). This catches "the midground has gone one green wash" and "the low band is crushed" before your eye admits it.
5. Iterate: list the three largest differences, fix, repeat (`versions/v1-procedural/docs/dev-workflow.md:49`). Fixes are data before code — placements in `src/config/composition.ts`, optics in `cameraConfig.ts`, DOF curves in `CinematicDofPass`, grade in `composer.ts` (`versions/v1-procedural/docs/dev-workflow.md:54`).

`dev-assets/reference.jpg` must be supplied locally; `silhouette.mjs:42` says so explicitly on a miss. The dev overlay is the interactive sibling of this loop (`versions/v1-procedural/docs/dev-workflow.md:26`).

## If you change this

- **Hits:** both comparison scripts hardcode `shots/ref-aspect.png` and the 1242×822 pixel geometry (`silhouette.mjs:22`, `measure.mjs:4`), so renaming or resizing the `ref-aspect` entry in `shots.mjs:24` silently misaligns every crop and band — they will still run and still print numbers. Changing the default `--t` (`shots.mjs:18`) re-poses the whole meadow; old `shots/` output stops being comparable. Removing `__papsukkalReady` (`App.ts:108`) hangs the capture at `shots.mjs:45`; note it is set *outside* the det branch, so the live loop arms it too. Removing the det branch (`App.ts:86`) therefore hangs nothing — the capture still succeeds, but the sim time and grain are no longer pinned, so successive plates differ by animation rather than by your edit and every number in step 4 becomes noise. Silent, not loud. Any new console error anywhere on the page fails the capture, not just a render error.
- **Does not hit:** V2's fidelity gate. That one diffs against a *committed* image (`versions/v2-reference-driven/public/reference/reference.jpg`) inside Playwright; same photograph, different role, different tool — editing these scripts cannot change V2's pass/fail. It also does not hit `npm test` or `npm run test:e2e`: nothing here runs in either suite, and no CI invokes it, so despite the "gate" wording in `silhouette.mjs:2` a failure here is a judgement, not a red build. And nothing here reaches `dist/` — `scripts/` is never imported by `src/`.

## Surfaces

| Surface | Role |
|---|---|
| Art-direction pass (human) | runs all three commands, reads the plates |
| `shots/` | written; gitignored (repo-root `.gitignore:3`) |
| `dev-assets/reference.jpg` | read-only input, supplied locally, never shipped |
| Dev compare overlay | interactive alternative on the live page |

## See

- Objects: `objects/pipeline/measurement-tools.md`, `objects/v1-scene/composition.md`, `objects/v1-scene/colour-grade.md`
- Source: `versions/v1-procedural/scripts/shots.mjs`, `versions/v1-procedural/scripts/silhouette.mjs`, `versions/v1-procedural/scripts/measure.mjs`, `versions/v1-procedural/docs/dev-workflow.md`
