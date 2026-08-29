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
| change specific code | `agent-workspace/00-context/codebase-map/_index.md` |
| judge whether a change helped | `agent-workspace/20-visual-gates/` |
| understand why something is built oddly | `agent-workspace/40-decisions/` |
| run, build or test | `docs/versions.md` |

## The rules that outrank a good idea

1. **The two versions never import each other.** Behaviour is COPIED with a
   provenance header. See `agent-workspace/00-context/version-separation.md`.
2. **Measure visual claims.** "It looks better" is not a result —
   `agent-workspace/20-visual-gates/` exists so claims are checkable.
3. **Hero screen placements are frozen**; orientation and morphology are open.
4. **The breeze is finished.** Do not redesign it.
5. **If a workspace file and the code disagree, the code wins** — fix the file
   in the same commit.

## Generated files

`AGENTS.md` and `agent-workspace/AGENTS.md` are byte-identical twins of the
`CLAUDE.md` beside them, produced by `node scripts/sync-twins.mjs`. Never edit a
twin; `--check` fails CI if one is stale.
