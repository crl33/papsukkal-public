# Development workflow

## Commands

```bash
npm run dev        # dev server on http://localhost:5183
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm test           # vitest unit suite (wind, sim, noise)
npm run test:e2e   # playwright: render/animate/reduced-motion/responsive
npm run shots      # deterministic screenshots for every framing → shots/
node scripts/motion-probe.mjs   # stroboscopic motion frames + stability probe
node scripts/perf-probe.mjs [WxHxDPR] [url]   # fps / draw calls
node scripts/video-probe.mjs    # 25s live recording (shots/video/) for motion QA
```

## Deterministic capture mode

Append `?det=1&t=<seconds>` to freeze the simulation at an exact time —
identical pixels on every run. `&seed=<n>` re-rolls the wind field (never
the composition). In det mode `window.__advanceTo(t)` steps the frozen
scene forward deterministically.

`?quality=high|medium|low` forces a quality tier.

## Reference comparison overlay (dev only)

The comparison overlay exists only in dev builds (`import.meta.env.DEV`
guard in `main.ts`; verified absent from `dist/`). The reference photograph
is not in the repo — drag & drop it onto the running dev page once (it
persists in localStorage). Then:

| Key | Mode |
| --- | --- |
| 1 | reference only |
| 2 | render only |
| 3 | 50/50 opacity overlay |
| 4 | vertical split |
| 5 | difference (blend mode) |
| 0 | off |

The overlay uses the same viewport as the render (cover-fit) so geometry
lines up with the canvas.

Optionally keep the file in `dev-assets/` (gitignored) for safe keeping.

## The iterative visual loop

1. change something
2. `npm run shots -- --only ref-aspect`
3. compare `shots/ref-aspect.png` against the reference
4. list the three largest differences, fix them, repeat

Composition placement is data, not code: adjust normalized screen positions
and depths in `src/config/composition.ts`; camera/optics numbers live in
`src/config/cameraConfig.ts`; DOF curves in `CinematicDofPass` (`deadZone`,
`nearScale`, `farScale`); grade in `composer.ts`.
