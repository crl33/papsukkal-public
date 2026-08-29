# What Papsukkal is

A landing page whose whole content is a wildflower meadow that moves: a
photograph-grade still image with a real-time breeze running through it. There
is no UI to speak of — the artwork *is* the page. All overlay typography was
deliberately removed.

## Two versions, two philosophies

Both are complete and independently runnable. They are different answers to the
same brief, kept side by side on purpose.

| | V1 — procedural | V2 — reference-driven |
|---|---|---|
| Path | `versions/v1-procedural/` | `versions/v2-reference-driven/` |
| Port | 5183 | 5193 |
| Idea | Rebuild the meadow in 3D from nothing | Animate the reference photograph itself |
| Every pixel is | synthesised geometry + shaders | the photograph's own pixels |
| The reference photo is | art direction only (gitignored) | the artwork (committed) |
| Depth of field | real, runtime (`CinematicDofPass`) | baked into the photo; no runtime DOF |
| Wind | `src/scene/wind/` | a COPY of V1's, in `src/wind/` |
| Hard gate | looks like the reference | at wind=0, *is* the reference (pixel-compared) |

V1 is where the active art-direction work has been happening. V2 is a proven
alternative approach with a much stronger static-fidelity guarantee and a much
weaker "it's really 3D" story.

## Run them

```bash
npm run install:v1 && npm run dev:v1     # http://localhost:5183
npm run install:v2 && npm run dev:v2     # http://localhost:5193
```

`build:v1|v2`, `test:v1|v2` mirror the same split. Each version is also a
normal standalone project — `npm run dev` inside its own folder works.

## What "done" looks like

A viewer sees a photograph, then notices it is moving. Not "a nice 3D flower
demo", and not a wobbling image. The gates in `../20-visual-gates/` exist to
keep that judgement honest.
