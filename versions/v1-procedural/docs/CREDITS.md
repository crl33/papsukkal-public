# Credits & adapted techniques

No code was copied verbatim from other projects. The following techniques
were studied and re-implemented/adapted; sources are credited both here and
at the point of use in the source.

## GPU Gems 3, Chapter 16 — "Vegetation Procedural Animation and Shading in Crysis" (Sousa, Crytek/NVIDIA)

Freely readable at developer.nvidia.com; no open-source license, so the
ideas were re-implemented from the math, not pasted:

- Root-fixed bend envelope with per-vertex length re-normalization
  (stems arc rather than stretch) — `vegetationMaterial.ts`.
- De-synchronization recipe: per-instance phase from world position,
  per-vertex phase, and summed waves at incommensurate frequencies —
  the petal flutter in `vegetationMaterial.ts`.
- SmoothTriangleWave primitive (`stw()` in the shader).

## siliconjungle/inkwell-webgpu-flowers (MIT)

- Deriving the flower-head frame from two samples of the bent stem spine —
  the rigid-head rotation in `vegetationMaterial.ts`.
- The general "power-curve envelope, rigid at the root" stance for stem
  deformation.

## achrefelouafi/VegetationGeneratorThreeJS (MIT)

- The damped-spring integrator pattern (`velocity += −k·x·dt`,
  multiplicative damping, dt clamping, deflection caps) that `PlantSim`'s
  oscillators follow, and the "wind applies force through a spring, never
  sets pose directly" architecture.
- Gust shaping that biases toward lulls with occasional smooth crests
  (`ridge()` in `WindField.ts` is in this spirit).

## momentchan/r3f-procedural-grass (MIT)

- Representing travelling gusts as noise advected along the wind direction
  (`WindField.ts` advects its ridge noise and FBM the same way).
- The practical warning that over-amplitude sway reads as jelly — our
  amplitudes are tuned small.

## Libraries

- [three.js](https://threejs.org) (MIT)
- [postprocessing](https://github.com/pmndrs/postprocessing) (Zlib) — the
  EffectComposer framework, ACES tone mapping; the DOF itself is custom
  (`CinematicDofPass`).
- Vite, Vitest, Playwright, TypeScript (MIT/Apache-2.0) — build/test only.

## Reference photograph

The master visual reference is a supplied photograph of unknown license; it
is **not** committed to this repository and is used only as an art-direction
target during development (see docs/dev-workflow.md).
