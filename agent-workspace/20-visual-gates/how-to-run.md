# How to run the gates

All commands from `versions/v1-procedural/` unless noted. The dev server must be
running (`npm run dev`, port 5183) for anything that captures.

## Capture a deterministic frame

```bash
npm run shots -- --only ref-aspect     # 1242×822, matches the reference exactly
npm run shots                          # the full responsive matrix
```

Frames land in `shots/`. `ref-aspect.png` is the one every gate compares.

## Silhouette / region comparison (Gates A, B, C, E)

```bash
node scripts/silhouette.mjs --list     # available regions
node scripts/silhouette.mjs hero       # or: cosmos2 orangeUR foreground background midground full
```

Writes to `shots/silhouette/<region>/`:

| File | Shows |
|---|---|
| `pair.png` | reference \| render, side by side |
| `gray.png` | both desaturated — silhouette and value structure only |
| `edges.png` | reference edges in magenta over render edges in green |
| `mass.png` | both heavily blurred — broad colour-mass distribution |

## Band statistics (Gate D)

```bash
node scripts/measure.mjs
```

Prints mean/median/p95/max luminance and teal coverage for the top, mid and low
bands, reference vs render, side by side. Targets are in
`../10-reference-analysis/palette-and-tone.md`.

## Motion and stability

```bash
node scripts/motion-probe.mjs --times 6,9,600   # strobe frames + NaN/bounds check at t=600
node scripts/video-probe.mjs                    # 25s recording for temporal QA
node scripts/perf-probe.mjs [WxHxDPR] [url]     # fps, draw calls, plant count
```

## Test gates

```bash
npm test          # unit: wind determinism, timestep independence, bounded deflection, geometry sanity
npm run test:e2e  # render, animation, reduced motion, responsive matrix — with console-error capture
```

V2 (`versions/v2-reference-driven/`) adds the hard one: `npm run test:e2e`
includes the **zero-motion fidelity gate** — the wind=0 composite is
pixel-compared against the reference photograph.

## Requirement

`silhouette.mjs` and `measure.mjs` need `dev-assets/reference.jpg` (gitignored).
Copy the reference photograph there before running them.
