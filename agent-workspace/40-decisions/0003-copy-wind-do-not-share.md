---
id: 0003
date: 2026-08-28
status: accepted
---

# 0003 — V2 copies V1's wind rather than importing it

## Context

V2 needed exactly V1's breeze personality — the part of the project nobody has
criticised. The obvious move was to extract it into a shared module.

## Decision

`WindField`, `PlantSim`, `utils/prng`, `utils/noise` were **copied** into V2
with a provenance header naming the source file, the tag `v1-procedural` and the
commit `15283c4`. One documented behavioural change: V2 zeroes the seeded
rest-curvature, because the photograph already encodes each plant's rest pose
and the simulation must be exactly zero at wind=0 for the fidelity gate to pass.

## Rejected alternatives

- **A shared package** — violates 0001; either version could no longer be
  deleted independently, and the frozen archive would depend on live code.
- **Reimplement from scratch** — would have lost the tuned gust personality,
  which is the thing worth keeping.

## Consequences

A wind improvement must be ported deliberately, and the copies can drift. The
provenance headers make the drift visible and intentional.

## What would reverse this

Decision 0001 being reversed. Nothing smaller.
