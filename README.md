# Papsukkal

The public landing page for Papsukkal: a wildflower photograph, alive with
a real-time breeze.

Two complete, independent implementations live in this repository — see
[docs/versions.md](docs/versions.md):

| | Where | Idea |
| --- | --- | --- |
| **V1 — Procedural 3D Floral Renderer** | [`versions/v1-procedural/`](versions/v1-procedural/) | The meadow is procedurally reconstructed in 3D: generated flowers, spatial wind field, per-plant oscillators, custom cinematic depth of field. Archived immutably as tag `v1-procedural` / branch `archive/v1-procedural`. |
| **V2 — Reference-Driven Living Photograph** | [`versions/v2-reference-driven/`](versions/v2-reference-driven/) | The reference photograph itself is decomposed into layers and animated with shader deformation driven by V1's breeze model. At zero wind it *is* the photograph. |

## Working on this project?

Start at **[`agent-workspace/`](agent-workspace/CLAUDE.md)** — an ICM workspace
holding what the code cannot: the reference targets, the visual gates that make
"closer to the reference" measurable, what has already been tried (including the
failures), why the architecture is the way it is, and where things stand right
now.

```
agent-workspace/
├── 00-context/            orientation, name collisions, the codebase map
├── 10-reference-analysis/ the reference photograph, as measurable targets
├── 20-visual-gates/       how we check whether a change helped
├── 30-experiments/        what was tried and what it cost
├── 40-decisions/          why it is built this way
└── 90-current-state/      where it stands, and the next three fixes
```

Keep it honest: `npm run check` verifies the generated entry-file twins are in
sync and that all ~300 source citations in the workspace still resolve.

## Quick start

```bash
npm run install:v1 && npm run dev:v1   # V1 on http://localhost:5183
npm run install:v2 && npm run dev:v2   # V2 on http://localhost:5193
```

Each version is fully self-contained (own `package.json`, sources, assets,
tests and docs) and documents itself in its own `docs/` directory.
