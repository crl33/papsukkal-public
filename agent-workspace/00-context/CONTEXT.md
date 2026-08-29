# 00-context — orient before you touch anything

One job: let a cold agent answer "where am I, what are these two things, and
what will bite me" without reading the source tree.

## Inputs

- Reference (every run): `project.md` — what Papsukkal is, the two versions
- Reference (every run): `name-collisions.md` — read this before anything else
- Reference (every run): `version-separation.md` — the hard repo contract
- Reference (when editing code): `codebase-map/CONTEXT.md` — one line per noun

## Process

1. Read `name-collisions.md`. Most confusion in this repo is a naming
   collision, not a code problem.
2. Read `project.md` if you do not know which version you are working in.
3. If you are about to edit code, open `codebase-map/CONTEXT.md` and then the one
   card for the thing you are changing — not the whole folder.
4. If your change would touch both versions, stop and read
   `version-separation.md`.

## Outputs

Nothing. This folder is factory: it configures understanding, it does not
accumulate. If you learned something durable, it belongs in `40-decisions/`
(why) or `30-experiments/` (what happened), not here.

## Human check

Ask a cold agent: "what is the difference between V1 and V2, and can I share
code between them?" If they cannot answer from this folder alone, it has failed.
