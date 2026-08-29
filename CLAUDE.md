# Papsukkal

A wildflower photograph, alive with a real-time breeze. Two complete,
independent implementations live here; work happens inside one of them, never
across both.

## Where things live

| Path | What it holds |
|---|---|
| `agent-workspace/` | **start here** — the reference targets, the visual gates, what was tried, what was decided, and where it stands |
| `versions/v1-procedural/` | V1: the meadow rebuilt in 3D from scratch (port 5183) |
| `versions/v2-reference-driven/` | V2: the reference photograph itself, animated (port 5193) |
| `docs/versions.md` | why there are two versions, and how to run each |
| `.claude/skills/icm-architect/` | the method `agent-workspace/` is structured with |

`agent-workspace/` is an ICM workspace: numbered folders carry sequence, each
folder states its job in its own `CONTEXT.md`, state is just files. The code
under `versions/` is ordinary software architecture and is not organised that
way — deliberately.

## Route by what you were asked to do

| If you were asked to | Go to |
|---|---|
| anything visual, or "make it closer to the reference" | `agent-workspace/CLAUDE.md` |
| pick up where the last agent stopped | `agent-workspace/90-current-state/` |
| change specific code | `agent-workspace/00-context/codebase-map/` |
| judge whether a change helped | `agent-workspace/20-visual-gates/` |
| understand why something is built oddly | `agent-workspace/40-decisions/` |
| run, build or test | `docs/versions.md` |

## The rules that outrank a good idea

1. **The two versions never import each other.** Behaviour is COPIED with a
   provenance header. See `agent-workspace/00-context/version-separation.md`.
2. **Measure visual claims.** "It looks better" is not a result —
   `agent-workspace/20-visual-gates/` exists so claims are checkable.
3. **Hero screen placements are frozen.** Orientation, colour and morphology are
   open; screen position is not — unless you were explicitly told otherwise.
4. **The breeze is good. Do not redesign it.** It is the one part nobody has
   complained about. See `agent-workspace/40-decisions/0003-copy-wind-do-not-share.md`.
5. **If a workspace file and the code disagree, the code wins** — fix the file
   in the same commit. If two workspace files disagree, the one deeper in
   `agent-workspace/` wins over this entry file; fix this file.

## Generated files

`AGENTS.md` and `agent-workspace/AGENTS.md` are generated copies of the
`CLAUDE.md` beside them, with a `GENERATED` banner line prepended — so they are
identical apart from that first line, and `cmp` will report a difference.
Verify with `node scripts/sync-twins.mjs --check`, never with `cmp`. Never edit
a twin; `--check` fails CI if one is stale.
