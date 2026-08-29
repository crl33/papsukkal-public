# Papsukkal

The public landing page for Papsukkal: a real-time, living reconstruction of
a wildflower photograph. A locked photographic camera looks into a meadow of
procedural cosmos, daisies, poppies and micro-blooms with an extremely
shallow depth of field, while a physically-modeled breeze — a shared spatial
wind field driving hundreds of individual damped-oscillator plants — moves
through the scene. The photograph, but alive.

Built with TypeScript, Three.js and Vite. No camera motion, no sine-wave
vegetation, no faked blur: real depth, real circle-of-confusion optics, real
plant mechanics. Details in [docs/architecture.md](docs/architecture.md).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5183
```

## Build & test

```bash
npm run build      # typecheck + production build → dist/
npm run preview    # serve dist/
npm test           # unit tests (wind field, plant sim, noise)
npm run test:e2e   # playwright smoke/responsive/reduced-motion suite
npm run shots      # deterministic screenshots at all framings → shots/
```

First e2e run may need `npx playwright install chromium`.

## Documentation

- [docs/architecture.md](docs/architecture.md) — rendering system, wind
  model, DOF, performance strategy
- [docs/visual-reference.md](docs/visual-reference.md) — decomposition of
  the master reference photograph and derived decisions
- [docs/dev-workflow.md](docs/dev-workflow.md) — commands, deterministic
  capture, the dev comparison overlay
- [docs/CREDITS.md](docs/CREDITS.md) — adapted techniques and licenses

## Accessibility & performance

`prefers-reduced-motion` keeps the full scene and stills the breeze.
Quality tiers adapt pixel ratio, DOF resolution and vegetation density to
the device — the hero composition is never reduced.
