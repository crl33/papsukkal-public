---
type: object
cluster: repo
universe: leftover
status: verified
verified: 2026-08-29 (commit 0b26008)
entity: versions/v1-procedural/src/scene/flowers/species.ts
---

# Retired petal builders — superseded, still present

Four exported geometry helpers in V1's `species.ts` — `addPetalRing`,
`addIrregularPetals`, `addNaturalCenter`, `addCenterDome` — with zero call sites anywhere
in `src`, `tests` or `scripts`.

## Why this shape

These are not dead-on-arrival code; they are the *previous generation* of the flower head.
They built petals as fully modelled surfaces: `addPetalRing` swept a parametric blade with
tip serration (`species.ts:106-145`), `addIrregularPetals` added per-petal gaussian
irregularity so a head read as a flower rather than a rosette (`species.ts:171-176`), and
`addNaturalCenter` seated real stamen blobs on the cone rim (`species.ts:382-417`).

The art pass (commit 5f3c176, "painted petal atlases" — which added `petalTextures.ts`
and `addTexturedPetals` together) replaced modelling with painting: petals became simple
curved cards on an atlas, whose alpha carries the silhouette and whose albedo carries
veins and mottling (`species.ts:268-275`) — cheaper and closer to the reference than any
amount of extra parametric geometry. It migrated every *head* builder — cosmos, daisy,
maroon, mid-field, foreground mass — which orphaned two of the four on the spot:
`addIrregularPetals` and `addNaturalCenter`. The other two outlived it — through 5f3c176
and 320e193, `buildMicroSprig` still built its tiny sprig rosettes from `addPetalRing`
plus `addCenterDome`. They fell to the reference-driven art pass (commit 0b26008), which
rebuilt the wire forest and replaced that rosette with an inline 5-petal star grid and an
`addBlob` heart (`species.ts:719-749`). Neither pass deleted anything; all four were left
where they stood.

They are orphans of a *decision*, not of neglect, and that is why they need a card: an
editor reading `species.ts` top-to-bottom meets `addPetalRing` long before
`addTexturedPetals` and may reasonably take it for the primitive to build on. It is not.

## Shape

- Definitions: `species.ts:106` (`addPetalRing`), `species.ts:177` (`addIrregularPetals`),
  `species.ts:387` (`addNaturalCenter`), `species.ts:420` (`addCenterDome`).
- Orphaned alongside them: the option interfaces `PetalRingOptions` (`species.ts:81`) and
  `IrregularPetalOptions` (`species.ts:152`) — no other file references either.
- Live replacements: `addTexturedPetals` (`species.ts:276`) called at `species.ts:526`,
  `546`, `609`, `670`, `849`, `1141`; `addTexturedCenter` (`species.ts:359`) called at
  `species.ts:567`, `624`, `686`, `868`, `1163`. Both read the atlas cells imported at
  `species.ts:10`. The sprig pair's replacement is not atlas-based at all: the local
  `blossom` helper inside `buildMicroSprig` (`species.ts:719-749`) builds a 5-petal star
  from raw grids plus one `addBlob` — a few pixels across, built in the thousands.
- Verification run at 0b26008: `grep -rn` for each of the four names across the `src`,
  `tests`, `scripts` and `docs` trees of V1 returns each definition line, plus one
  historical mention of `addIrregularPetals` / `addNaturalCenter` in
  `versions/v1-procedural/docs/visual-reference.md:149` — prose that correctly describes the
  path as retired, not a call site. (That paragraph previously described the retired path
  as current; it was corrected when this card was written.)
- Historical proof they were live: `git show v1-procedural:src/scene/flowers/species.ts`
  shows all four called (`addIrregularPetals` at 371/387/438/516, `addNaturalCenter` at
  402, `addCenterDome` at 468/536/626/656/902, `addPetalRing` at 611/643/889).
- Orphaned in two steps, not one: `git show 320e193:versions/v1-procedural/src/scene/flowers/species.ts`
  still shows `addPetalRing` called at 704 and `addCenterDome` at 719 (both inside
  `buildMicroSprig`), with `addIrregularPetals` and `addNaturalCenter` already
  definition-only. At 0b26008 all four are definition-only.
- Roughly 190 lines of the file's 1166, counting the two option interfaces.

Citations: `versions/v1-procedural/src/scene/flowers/species.ts:81`, `versions/v1-procedural/src/scene/flowers/species.ts:106`, `versions/v1-procedural/src/scene/flowers/species.ts:152`, `versions/v1-procedural/src/scene/flowers/species.ts:177`, `versions/v1-procedural/src/scene/flowers/species.ts:268`, `versions/v1-procedural/src/scene/flowers/species.ts:276`, `versions/v1-procedural/src/scene/flowers/species.ts:359`, `versions/v1-procedural/src/scene/flowers/species.ts:387`, `versions/v1-procedural/src/scene/flowers/species.ts:420`, `versions/v1-procedural/src/scene/flowers/species.ts:10`, `versions/v1-procedural/docs/visual-reference.md:149`

## Connected to

- **owns:** nothing at runtime
- **owned-by:** `v1-scene/species-builders` (the file they still live in)
- **joins:** `v1-scene/petal-atlas` — the atlas is what made them redundant
- **looks-like-but-is-not:** a shared primitive layer. `addStem` (`species.ts:32`),
  `addBlob` (`species.ts:440`) and `addLeaf` (`species.ts:464`) sit in the same "shared
  parts" block and *are* live; only these four are orphaned.

## If you change this

- **Hits:** nothing in the build or the tests — that is the point. Deleting the four plus
  their two interfaces compiles clean and changes no pixel; `npm run build:v1`
  (`tsc --noEmit && vite build`) is the check. The only consequence is documentary: grep
  the docs for the four names before deleting, and correct whatever still describes them.
- **Does not hit:** the small helpers they call. `varied` (`species.ts:22`),
  `smoothstep01` (`species.ts:147`) and `addBlob` (`species.ts:440`) all have live callers
  elsewhere in the file (`species.ts:574`, `747`, `800`, `966`, `1050`, …), so removing
  the four does not cascade into an unused-helper sweep. Also does not hit V2: V2 has no
  procedural geometry at all — its petals are photographic plates.

**Recommendation:** safe to delete. Not deleted here — per the map's method, nothing is
removed silently; a human decides, and this card is the evidence for that decision. Until
then: do not implement against these four, and do not "restore" them by wiring a builder
back to `addPetalRing` — the atlas path is the current one.

## Surfaces

| Surface | Role |
|---|---|
| `versions/v1-procedural/src/scene/flowers/species.ts` | defines them; never calls them |
| `versions/v1-procedural/docs/visual-reference.md` | describes the atlas path that replaced them |
| git tag `v1-procedural` | the snapshot where all four were live |

## See

- Source: `versions/v1-procedural/src/scene/flowers/species.ts`
- Verify: `grep -rn "addPetalRing\|addIrregularPetals\|addNaturalCenter\|addCenterDome" versions/v1-procedural/src versions/v1-procedural/tests`
