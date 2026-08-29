---
id: 0005
date: 2026-08-29
status: accepted
---

# 0005 — Petals are painted-atlas cards, not modelled silhouettes

## Context

Mesh-outlined petals read as "mathematical rosettes": too regular, and detail
cost polygons at every zoom level.

## Decision

Each species owns a seeded 1024² atlas painted deterministically at startup
(`petalTextures.ts`): four petal variants with organic **alpha** silhouettes
(serrated / lobed / ruffled), painted base→tip ramps, branching veins, lateral
shading, plus a centre disc. Petal meshes became simple curved cards; the
painted alpha carries the silhouette. Artwork ships as code, not binaries.

## Rejected alternatives

- **Higher-resolution petal meshes** — tried; over-resolving the striations
  produced a pinwheel look and did not fix silhouette regularity.
- **Authored image files** — would put binary assets in the repo and break the
  "every V1 pixel is synthesised" property.

## Consequences

Alpha-cutout rendering for petals. Per-species colour changes are one ramp edit
and affect that species everywhere. Layout constants (`PETAL_CELLS`,
`CENTER_CELL`) are kept DOM-free so geometry builders and headless tests can use
them without a canvas.

## What would reverse this

Needing petal geometry that self-shadows or deforms per-petal in ways a card
cannot express.
