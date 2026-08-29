---
date: 2026-08-29
what: validate this workspace by making cold agents actually use it
result: it works — but the front door was broken and the guard could not see it
---

# Cold-walk validation of the workspace

## Why

A workspace that has never been used by anyone but its author is a guess. The ICM
walk test is the check: hand the documents to agents with **no** memory of the
repository, forbid them from grepping the source, and see whether the files alone
can carry them to the right place.

## Method

Four agents, each starting at the root `CLAUDE.md` and nowhere else. None could
grep `versions/`, list directories at random, or open a file the documents had not
routed them to. Each counted its "hops" — files opened because a previous file
pointed at them.

| Walk | Question |
|---|---|
| orient | What are the two versions? What is being worked on? How would I know I improved it? |
| change-task | "Make the hero flower's magenta deeper" — route to the right file without grepping |
| trap | "Refactor the duplicated wind code into a shared module" — a request the rules forbid |
| accuracy | Audit the load-bearing claims against source; run the gates |

## Result

All four oriented. The routing holds, the trap held, and the measured numbers were
accurate. The **trap walk was stopped at hop 0** — the entry file's rule 1 names and
forbids that exact refactor before a second file is opened — and it verified the
reason rather than merely obeying it.

The change-task walk reached the correct file in a minimum of 5 hops, and two
disambiguations arrived *before* it could go wrong: `name-collisions.md` defines
"hero" as `focusRole: "hero"` rather than "any large flower", which resolves the
request to exactly one of the four heroes.

## What it found — 15 findings, all fixed

The value was in the failures. Grouped:

**Routing (the expensive one).** The root `CLAUDE.md` routed "change specific code"
— the highest-traffic row — to an `_index.md` at the `codebase-map/` root, which
does not exist. The real entry is `CONTEXT.md`; an `_index.md` does exist one level
deeper, so the citation looked plausible and was off by exactly one directory.
Three of the four walks reported it independently. `name-collisions.md` carried the
same slip (`codebase-map/repo/…` missing the `objects/` segment) — and the widened
guard later found the *same dead route* a third time, in `00-context/CONTEXT.md`,
which no walk had reached.

**The guard was blind to it.** `scripts/check-workspace-links.mjs` hard-coded
`agent-workspace` and walked only that subtree, so it reported "all citations
resolve" while the front door 404'd. A clean exit that does not cover the
highest-cost document manufactures false confidence. Now widened to `docs/` and the
root entry files, and to markdown links as well as backtick citations. It
immediately caught two more defects, one of them introduced by the very commit
that widened it.

**Claims stated more strongly than the evidence.** Gate G said the plate's
reconstruction margin exceeds the displacement clamp; the test behind it compares
two *constants* and never inspects a pixel — the real protection is the generous
silhouette. Gate H claimed 30/60/120 fps produce "identical trajectories"; the test
runs two rates, compares final state, and converges to 1e-6. `status.md` opened
"All gates green" while visual Gate D was the open gap — in a repo whose own
`name-collisions.md` warns that "the gates" means two unrelated things.

**A trap nobody had flagged.** `palette.magentaDeep` is a ghost with zero
consumers: right name, right semantics, already darker, one grep away from an agent
asked to deepen the hero's magenta — which actually lives in the `cosmosMagenta`
ramp. Now a row in `name-collisions.md`.

**An unrunnable gate.** Every V1 visual gate needs `dev-assets/reference.jpg`,
which is gitignored by decision. No document said where to get it, so on a fresh
clone an agent could understand the task perfectly and verify nothing. It is
byte-identical (`e9dd6070…`) to the copy committed under V2; `how-to-run.md` now
carries the copy recipe, and both scripts fail with it instead of ENOENT.

## The follow-up audit — and the defect the fixes themselves caused

One card had claimed "five principals, six broadened accents, three near-field
masses" for a total of 13 (5+6+3=14; the real count was five broadened). That is a
class of error, not an incident, so a second agent re-counted every numeric claim
across the 27 cards against source. Most held — 82 placements, ~692 plants, 13
rigged layers, 7 atlas species, 8 mechanics presets, every quoted constant.

Six clusters did not, and the largest was **self-inflicted**: adding the
`MISSING_REF` guard to `silhouette.mjs` and `measure.mjs` shifted every line in
both files, silently invalidating ten `path:line` citations in
`processes/compare-against-reference.md`. The fix for one finding broke the
evidence for another, in the same session, and the guard could not see it — it
only checks that a cited line is within the file, not that the line still says
what the citation claims.

Also wrong: a 2+3 breakdown of six scripts, two `composer.ts:5` citations for a
symbol on line 3, three `docs/versions.md` anchors that had drifted, a
`visual-reference.md:143` that should have been `:149`, an e2e claim that applied
the strict bar to all five viewports when four use a looser one, and four
references to a pipeline card named asset-build — **which has never existed**
(the real one is `processes/prepare-assets.md`).

That last one prompted the guard's second widening: it had only ever matched
repo-prefixed paths, so every card-to-card reference — the map's own connective
tissue — went unchecked. It now resolves true relative paths strictly and cluster
shorthand by suffix. Coverage went from 337 citations across 66 files to **580
across 71**, and that pass is what surfaced the third copy of the dead route.

## The lesson worth keeping

Every routing defect was in a file **the author never had to follow**, because the
author already knew where things were. A citation that is one directory level off
is invisible to the person who wrote it and fatal to the person who needs it.
Author-side review cannot find this class of defect; only a cold reader can. Run
the walk test after any substantial change to routing.

And: extend the guard to whatever the walk test finds by hand. A defect found once
should not need to be found twice. Both widenings paid for themselves inside the
same session — each one immediately caught something the manual pass had missed,
including defects the manual pass had just created.

The deeper point: **editing code invalidates the documents that cite it**, and
line-number citations are the most fragile thing in the map. The guard catches a
citation past end-of-file; it cannot catch one that has quietly slid onto the wrong
line. When you change a file the map cites, re-check the citations in the same
commit — the workspace's rule 5 is not only about prose going stale.

## Cost

Five agents, ~710k tokens, ~26 minutes wall clock: four cold walks, then one
numeric re-count of every card.
