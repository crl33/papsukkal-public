# Papsukkal

The public landing page for Papsukkal: a wildflower photograph, alive with
a real-time breeze.

Two complete, independent implementations live in this repository — see
[docs/versions.md](docs/versions.md):

| | Where | Idea |
| --- | --- | --- |
| **V1 — Procedural 3D Floral Renderer** | [`versions/v1-procedural/`](versions/v1-procedural/) | The meadow is procedurally reconstructed in 3D: generated flowers, spatial wind field, per-plant oscillators, custom cinematic depth of field. Archived immutably as tag `v1-procedural` / branch `archive/v1-procedural`. |
| **V2 — Reference-Driven Living Photograph** | [`versions/v2-reference-driven/`](versions/v2-reference-driven/) | The reference photograph itself is decomposed into layers and animated with shader deformation driven by V1's breeze model. At zero wind it *is* the photograph. |

## Quick start

```bash
npm run install:v1 && npm run dev:v1   # V1 on http://localhost:5183
npm run install:v2 && npm run dev:v2   # V2 on http://localhost:5193
```

Each version is fully self-contained (own `package.json`, sources, assets,
tests and docs) and documents itself in its own `docs/` directory.
