---
id: 0002
date: 2026-08-29
status: accepted
---

# 0002 — Hero screen placements are frozen; morphology is open

## Context

After several art-direction passes the major subjects landed in approximately
the reference's screen regions. Continuing to move them was churning the
composition while the real gap was *shape*, not position.

## Decision

The `screen` coordinates of hero placements in `versions/v1-procedural/src/config/composition.ts`
are frozen. Orientation (`facing`), size, colour, morphology and the surrounding
filler remain open.

## Rejected alternatives

- **Keep tuning positions each pass** — every change invalidated the previous
  silhouette comparison, so nothing converged.

## Consequences

A composition error that is genuinely positional cannot be fixed without
explicitly reopening this. That is intended: it forces the case to be made.

## What would reverse this

A silhouette comparison (Gate A) showing a major mass in visibly the wrong
region of the frame, with the owner agreeing the placement — not the shape — is
what is wrong.
