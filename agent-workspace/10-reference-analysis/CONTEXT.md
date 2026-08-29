# 10-reference-analysis — what we are aiming at, stated as facts

One job: turn the reference photograph into claims a later agent can check,
so "closer to the reference" stops being a matter of taste.

## Inputs

- Reference (every run): the photograph itself. V1 expects it at
  `versions/v1-procedural/dev-assets/reference.jpg` (gitignored — supply it
  locally). V2 ships it at
  `versions/v2-reference-driven/public/reference/reference.jpg`.
- Reference (every run): `composition.md`, `optics.md`, `palette-and-tone.md`

## Process

1. Read `optics.md` first — the depth structure is what makes the image read as
   a photograph, and most failures are optical, not botanical.
2. Read `composition.md` for where the subjects sit and how big they are.
3. Read `palette-and-tone.md` for colour and the measured band luminances.
4. Take the numbers to `../20-visual-gates/` and actually measure.

## Outputs

Nothing per run. This is factory. If measurement proves one of these claims
wrong, correct the claim here and note it in `../30-experiments/`.

## Human check

Open the photograph next to this folder's claims. Any claim you cannot see in
the image is wrong and must be removed — an unverifiable target is worse than
no target.

## The photograph is authoritative

Where this prose and the image disagree, the image wins. These files exist to
make the image *measurable*, never to replace looking at it.
