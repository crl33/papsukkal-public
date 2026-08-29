# Versions

This repository deliberately contains two complete, independent
implementations of the Papsukkal living-meadow landing page. They share no
runtime source, no assets and no dependency state — either can be deleted
without damaging the other.

> **Working on this project?** Start at [`agent-workspace/`](../agent-workspace/CLAUDE.md):
> the reference targets, the visual gates, what has already been tried, what was
> decided, and where things stand. This file only covers what the versions are
> and how to run them.

## V1 — Procedural 3D Floral Renderer

`versions/v1-procedural/`

The meadow is **procedurally reconstructed**: every flower, stem and bud is
generated Three.js geometry placed through a locked photographic camera; a
spatial wind field drives per-plant damped oscillators; a custom
circle-of-confusion blur pyramid provides the cinematic depth of field.
The reference photograph is used as an art-direction target only — every pixel
on screen is synthesized.

Archival markers (immutable — do not rebase, delete or "clean up"):

- tag `v1-procedural`
- branch `archive/v1-procedural`

The working tree under `versions/v1-procedural/` has since diverged from these
snapshots (an art-direction pass). That is expected: the archive is frozen, the
working version continues.

## V2 — Reference-Driven Living Photograph

`versions/v2-reference-driven/`

The reference photograph itself is the appearance source. The image is
decomposed offline into layered RGBA plates (background plate, per-flower
cutouts, static background patches) with control data (anchors, bend weights);
at runtime, subdivided textured meshes are deformed in vertex shaders by the
**same breeze model as V1** (the wind/oscillator implementation was COPIED from
the V1 archive and adapted — see
`versions/v2-reference-driven/docs/architecture.md` for provenance). With wind
at zero, the composite reproduces the photograph; with wind on, the photograph
quietly comes alive. No AI runs at website runtime — all assets are prepared
offline and committed.

## Running

From the repository root:

```bash
npm run install:v1   # once
npm run dev:v1       # http://localhost:5183

npm run install:v2   # once
npm run dev:v2       # http://localhost:5193
```

`build:v1` / `build:v2` and `test:v1` / `test:v2` mirror the same split.
Each version can also be operated directly from its own directory with
plain `npm run dev` / `npm run build` / `npm test`.
