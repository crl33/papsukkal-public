# Version separation — the contract

The single rule that most often gets broken by a well-meaning refactor.

## The rule

**V1 and V2 never import each other.** Not a helper, not a type, not a util.
Shared behaviour is **copied** with a provenance header naming the source file
and the commit it came from.

Verify at any time — this must return only comment lines, never an `import`:

```bash
grep -rn "v1-procedural\|v2-reference-driven" versions/*/src versions/*/tools --include='*.ts' --include='*.mjs'
```

## Why

Either version must be deletable without touching the other. They are two
products in one repo, not one product with two front ends. A shared package
would couple their release cadence, their dependencies and their bugs — and V1
carries an immutable archive that must stay buildable exactly as it was.

## What is copied today

V2 copied V1's wind wholesale — `WindField`, `PlantSim`, `utils/prng`,
`utils/noise` — each with a header naming `tag: v1-procedural, commit 15283c4`.
One documented behavioural change: V2 zeroes the seeded rest-curvature, because
the photograph already encodes every plant's rest pose and the sim must be
exactly zero at wind=0.

## The frozen things (and the thing that is not)

- `v1-procedural` (git tag) — immutable snapshot
- `archive/v1-procedural` (git branch) — immutable snapshot
- `versions/v1-procedural/` (working tree) — **not frozen**, actively evolving

"Restore V1" is ambiguous. Ask which. Reconciling the working tree back to the
tag would silently discard the entire art-direction pass.

## If you think you need to share code

You do not. Copy it with a provenance header, or implement it twice. If the
duplication becomes genuinely painful, that is a decision for
`../40-decisions/`, not a refactor to slip into an unrelated change.
