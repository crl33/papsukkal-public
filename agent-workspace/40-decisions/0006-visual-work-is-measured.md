---
id: 0006
date: 2026-08-29
status: accepted
---

# 0006 — Art-direction claims must be measured, not asserted

## Context

Iterations were oscillating: a change would be made because the render "looked
too dark", then reversed next pass. Two separate misdiagnoses (stems too bright;
foreground blur radius too small) cost several rounds each and were both wrong.

## Decision

Two dev-only instruments, and the rule that a change ships with numbers:

- `scripts/silhouette.mjs <region>` — reference|render pair, greyscale,
  edge overlay, blurred colour-mass, for a named region
- `versions/v1-procedural/scripts/measure.mjs` — band luminance and teal-coverage statistics against
  the reference

Every change records before/after numbers in `../30-experiments/`.

## Rejected alternatives

- **Eyeball it** — produced the oscillation this decision exists to stop.

## Consequences

Two scripts and a `sharp` dev dependency in V1. `dev-assets/reference.jpg` must
be supplied locally (gitignored — the photograph's licence is unknown, so it is
deliberately not committed to a public repo).

## What would reverse this

Nothing foreseeable. Note the known limit instead: the band metric is gameable —
a flat uniform wash scores well while looking dead — so it is always paired with
a silhouette gate or a look at the frame.
