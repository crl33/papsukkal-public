<!-- GENERATED from agent-workspace/CLAUDE.md by scripts/sync-twins.mjs — do not edit. -->
# Papsukkal — agent workspace

Everything an agent needs to work on this project that is **not** in the code:
what the artwork is supposed to look like, how we measure whether it does, what
has already been tried, and what was decided.

The code lives in `../versions/` and is ordinary software architecture. This
workspace is ICM: numbered folders carry sequence, each folder states its own
job in its `CONTEXT.md`, and state is just files.

Generated twins: `AGENTS.md` is a byte-identical copy of this file
(`node scripts/sync-twins.mjs`). Edit `CLAUDE.md` only.

## Where things live

| Folder | What it holds | Stable? |
|---|---|---|
| `00-context/` | orientation: the two versions, name collisions, hard rules, codebase map | factory |
| `10-reference-analysis/` | the reference photograph, decomposed into targets | factory |
| `20-visual-gates/` | how we measure "closer to the reference" — and the numbers | factory |
| `30-experiments/` | what was tried and what actually happened | product |
| `40-decisions/` | why the architecture is the way it is | product |
| `90-current-state/` | where it stands right now, and the next three fixes | product |

## Route by what you were asked to do

| If you were asked to | Start at | Then |
|---|---|---|
| make the render look closer to the reference | `90-current-state/` | `10-reference-analysis/` then `20-visual-gates/` |
| change something specific in the code | `00-context/codebase-map/` | the card for that noun |
| judge whether a change helped | `20-visual-gates/` | run the gates, record in `30-experiments/` |
| understand why something is built oddly | `40-decisions/` | the decision record |
| add a feature or species | `00-context/codebase-map/` | `40-decisions/` before you diverge |
| pick up where the last agent stopped | `90-current-state/` | — |

## The rules that outrank a good idea

1. **Measure before and after.** "It looks better" is not a result. `20-visual-gates/`
   exists so claims are checkable. Record the numbers in `30-experiments/`.
2. **The two versions never import each other.** Behaviour is COPIED with a
   provenance header. See `00-context/version-separation.md`.
3. **Hero screen placements are frozen.** Orientation, colour and morphology are
   open; screen position is not — unless you were explicitly told otherwise.
4. **The breeze is good. Do not redesign it.** It is the one part nobody has
   complained about. See `40-decisions/0003-copy-wind-do-not-share.md`.
5. **If a file here and the code disagree, the code wins** — fix the file in the
   same commit.

## The one rule

Nothing here is worth keeping if it is stale. When you finish a piece of work,
update `90-current-state/` — that is the handoff.
