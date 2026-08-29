# 20-visual-gates — how we decide whether it got closer

One job: replace "it looks better" with something another agent can re-run.

## Inputs

- Reference (every run): `../10-reference-analysis/` — the targets
- Reference (every run): `how-to-run.md` — the exact commands
- Reference (every run): `gates.md` — what each gate proves and its threshold
- Working (this run): whatever you just changed

## Process

1. Capture a deterministic frame **before** your change if you do not already
   have one. Non-deterministic captures cannot be compared.
2. Make the change.
3. Re-capture and run the gate that covers what you touched (`gates.md` says
   which).
4. Write the before/after numbers into `../30-experiments/`. A change with no
   recorded numbers did not happen.

## Outputs

- Frames in `versions/v1-procedural/shots/` (gitignored)
- Comparison images in `shots/silhouette/<region>/`
- An experiment entry in `../30-experiments/`

## Human check

Look at the frame. The gates are instruments, not judges — a render can move
toward the target numbers and still look worse. If the numbers improved and
your eye disagrees, trust your eye and say so in the experiment entry.

## Determinism is a precondition

`?det=1&t=N` freezes the simulation at an exact time, and `window.__advanceTo(t)`
steps it. Without this the wind makes every capture different and no comparison
is valid.
