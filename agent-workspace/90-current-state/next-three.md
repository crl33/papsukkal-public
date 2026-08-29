---
updated: 2026-08-29
---

# Next three, ranked

Each is stated so it can be verified, not just attempted.

## 1 — Close the midground gap (mid band 38–46 → 54.5)

The reference's midground is a dense, luminous botanical mass; ours is sparser
and darker, and the space between sharp plants still reads as backdrop rather
than out-of-focus vegetation.

Where: `MeadowScene.addBackFoliage` (the filler layer added for exactly this),
`environment.ts` (the sage band and ground haze), and the world-Y occlusion in
`vegetationMaterial.ts`.

Trap already hit twice: brightening the filler also brightens the **low** band,
which currently matches and must not regress. The two bands are coupled through
the near-field blur, so check all three bands after every change.

Verify (from `versions/v1-procedural/`): `node scripts/measure.mjs` — mid mean toward 54.5 with low staying ≈27
and teal near 13%, plus Gate A so it does not become a flat wash.

## 2 — Highlights are compressed (p95 ~88 vs 110, max ~188 vs 247)

The reference has brighter accents than we can currently reach — sunlit petals
and white daisies carry real highlight energy.

Where: key light in `vegetationMaterial.ts`, the ACES + grade chain in
`composer.ts`.

Verify (from `versions/v1-procedural/`): `node scripts/measure.mjs` p95 and max in the mid band, without lifting the p50.

## 3 — Botanical density between the sharp subjects

Side by side, the reference is packed: overlapping plants at every depth with
almost no empty gaps. Ours has visible voids.

Constraint: this is redistribution, not "more vegetation" — total instance count
should stay roughly flat while coverage rises. Trap: the last attempt at more
filigree produced glowing mint pipes (see
`../30-experiments/2026-08-29-identifying-the-pipes.md`).

Verify: Gate A at thumbnail size, and the frame itself.

## Not on this list, deliberately

The breeze, the camera, hero screen placements, and the landing page. All are
either finished or frozen — see `../40-decisions/`.
