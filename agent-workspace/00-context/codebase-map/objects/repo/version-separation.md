---
type: object
cluster: repo
universe: live
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: docs/versions.md
---

# Version separation — the rule that keeps V1 and V2 apart

Two complete implementations live side by side under `versions/`; they share no runtime
source, no assets and no dependency state, and shared behaviour is **copied with a
provenance header**, never imported.

## Why this shape

V1 synthesises every pixel; V2 animates the photograph itself. They answer the same brief
with opposite methods, and the point of the repo is that both remain *readable as
finished work*. An import edge would destroy that: V1's archive could no longer be frozen
(V2's evolution would drag it), and neither version could be deleted or shipped alone.

So the wind model — the one genuinely shared idea — was duplicated instead, each V2 copy
headed by the exact V1 file and commit it came from. That makes the duplication auditable
rather than accidental: a copy can always be diffed against its stated origin. Drift
between two wind implementations is the price, paid deliberately.

## Shape

- Contract text: `docs/versions.md:3-6` — "share no runtime source, no assets and no
  dependency state — either can be deleted without damaging the other."
- Four copied files under `versions/v2-reference-driven/src/`, each opening with the same
  8-line block naming `tag: v1-procedural, commit 15283c4`: `wind/WindField.ts:1-8`,
  `wind/PlantSim.ts:3`, `utils/prng.ts:1-8`, `utils/noise.ts:3`. The invariant is that
  **no import edge crosses versions**, in either direction — not that V1 goes unmentioned.
  Prose references are expected and common outside those four headers: `windPos` reuses V1
  composition coordinates (`versions/v2-reference-driven/src/config/layers.ts:58-60`),
  `WIND_SEED = 1337` "matches V1's default personality" (`:280`), and the shader comments
  name V1's bend envelope (`versions/v2-reference-driven/src/shaders/layerMaterial.ts:5`).
  Only the four headers claim provenance; the rest is commentary.
- Dependency sets genuinely differ: V1 needs `postprocessing` + `three`
  (`versions/v1-procedural/package.json:15-18`), V2 only `three`
  (`versions/v2-reference-driven/package.json:16-18`). Separate `node_modules`, lockfiles,
  vite/playwright configs, `tests/`, `docs/`, `shots/`.
- Root `package.json` is orchestration only (`package.json:4`): eight `npm --prefix`
  scripts, `dev:v1` / `dev:v2` / `build:*` / `test:*` / `install:*` (`package.json:5-14`).
  Ports 5183 (V1) and 5193 (V2) — `docs/versions.md:53-57`.
- **Frozen vs working tree.** The tag `v1-procedural` and the branch
  `archive/v1-procedural` both resolve to commit `15283c4` ("Critique-driven refinement")
  and are marked immutable (`docs/versions.md:24-27`). `versions/v1-procedural/` in the
  working tree is **not** frozen — an art-direction pass has since diverged it.
  `git diff --stat v1-procedural:src main:versions/v1-procedural/src` at commit 0b26008
  reports **11 files changed, 1323 insertions(+), 340 deletions(-)**, concentrated in
  `scene/flowers/species.ts` (709 changed lines) and a new
  `scene/flowers/petalTextures.ts` (445 lines).

Citations: `docs/versions.md:3`, `docs/versions.md:19`, `docs/versions.md:33`, `docs/versions.md:45`, `package.json:4`, `package.json:5`, `versions/v1-procedural/package.json:15`, `versions/v2-reference-driven/package.json:16`, `versions/v2-reference-driven/src/wind/WindField.ts:1`, `versions/v2-reference-driven/src/config/layers.ts:58`, `versions/v2-reference-driven/src/utils/prng.ts:1`, `versions/v2-reference-driven/src/wind/PlantSim.ts:3`, `versions/v2-reference-driven/src/utils/noise.ts:3`

## Connected to

- **owns:** the no-cross-import rule, the provenance-header convention, the root scripts
- **owned-by:** `docs/versions.md` (the written contract), enforced by convention only —
  no lint rule exists
- **joins:** `wind/wind-field`, `wind/plant-oscillator` (the copied pair),
  `v1-scene/v1-app`, `v2-layers/v2-app`, `pipeline/dev-gates`
- **looks-like-but-is-not:** a monorepo with shared packages. There is no workspaces
  field, no shared `src/`, no common package — `--prefix` delegation is the whole
  mechanism.

## If you change this

- **Hits:** any attempt to "DRY up" the duplicated wind. Adding
  `import … from "../../../v1-procedural/src/…"` to V2 is a **contract violation, not a
  refactor**: it makes `versions/v1-procedural` undeletable, and because the manifests
  differ it drags V1's dependency tree (`postprocessing`) into V2's build graph. Lifting
  the wind into a shared package breaks `docs/versions.md:3-6` outright and orphans the
  four provenance headers. If you *do* re-sync a copy from V1, update its header commit —
  a stale `15283c4` is worse than no header. Renaming either directory breaks all eight
  root scripts (`package.json:5-14`).
- **Does not hit:** the archive. Editing `versions/v1-procedural/src` does **not** mutate
  the tag or the archive branch — separate commits at `15283c4`, and the working tree
  already differs by 11 files. "V1 is frozen, don't touch it" is false as stated: the
  *snapshot* is frozen, the *directory* is live and has moved. Nor does it hit V2 — fixing
  a bug in `versions/v1-procedural/src/scene/wind/WindField.ts` leaves V2's copy behaving
  exactly as before; V2's e2e fidelity gate, not V1, decides whether V2's wind is right.

## Surfaces

| Surface | Role |
|---|---|
| `package.json` (root) | writes nothing; delegates via `npm --prefix` |
| `docs/versions.md` | the contract text humans and agents read |
| the copied files under `versions/v2-reference-driven/src/wind/` and `versions/v2-reference-driven/src/utils/` | carry provenance headers back to V1 |
| git tag `v1-procedural` / branch `archive/v1-procedural` | frozen snapshot at `15283c4` |

## See

- Source: `docs/versions.md`
- Source: `package.json`
- Source: `versions/v2-reference-driven/src/wind/WindField.ts`
- Verify: `git diff --stat v1-procedural:src main:versions/v1-procedural/src`
