---
id: 0007
date: 2026-08-29
status: accepted
---

# 0007 — V1 does not commit the reference photograph; V2 must

## Context

The reference photograph's licence is unknown, and this is a public repository.

## Decision

- **V1** treats it as art direction only. It lives at `dev-assets/reference.jpg`,
  gitignored, supplied locally. Nothing in the shipped V1 bundle derives from it
  — every pixel is synthesised.
- **V2** cannot work without it: it *is* the artwork. It is committed at
  `public/reference/reference.jpg`, and the licence question is inherited by
  anyone deploying V2 publicly.

## Rejected alternatives

- **Commit it for V1 too** — unnecessary; V1 only needs it during development.
- **Ship V2 without it** — impossible; V2 has no other source of appearance.

## Consequences

V1's visual gates cannot run on a fresh clone until the photograph is placed.
That is stated in `../20-visual-gates/how-to-run.md`. Deploying V2 publicly is a
licensing decision the owner must make.

## What would reverse this

Confirmation of the photograph's licence, or replacing it with an image whose
rights are held.
