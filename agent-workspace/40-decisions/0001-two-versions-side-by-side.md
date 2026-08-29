---
id: 0001
date: 2026-08-28
status: accepted
---

# 0001 — Keep V1 and V2 as two independent products

## Context

V2 (animating the reference photograph) began as a redirection away from V1
(rebuilding the meadow procedurally). V1 was working and liked, especially its
breeze.

## Decision

Both versions live in the repo, fully independent: own `package.json`, own
sources, own assets, own tests, own port. Either can be deleted without touching
the other. V1's state at redirection is frozen as tag `v1-procedural` and branch
`archive/v1-procedural`.

## Rejected alternatives

- **Mutate V1 into V2** — would have destroyed a working implementation to reach
  an unproven one.
- **A shared core package** — couples release cadence, dependencies and bugs,
  and would make the frozen archive unbuildable in isolation.

## Consequences

Deliberate duplication (the wind model exists twice). Root scripts must route by
version. A change intended for "the project" must be made twice or scoped to one.

## What would reverse this

One approach being abandoned outright by the owner. Duplication pain alone is not
sufficient — that was the accepted cost.
