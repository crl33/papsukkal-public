# codebase-map — the nouns and verbs of the source tree

One job: get you to the two or three source files that matter for your change,
without reading `versions/`.

The code is the source of truth. These cards cite it (`path:line`) and carry the
*why* and the *waterfall*. They never restate behaviour — if a card starts
narrating a function, that content belongs in the source file.

## Inputs

- Reference (every walk): `../name-collisions.md` — read before anything else
- Reference (every walk): `objects/_index.md` — one line per noun
- Working (this task): the one card for the thing you are changing
- Working (spanning changes): `effects/CONTEXT.md` — routes by *change*, not noun

## Process

1. Find your noun in `objects/_index.md`. Open **that one card**, not the folder.
2. Read its **If you change this → Hits / Does not hit**, and open what Hits names.
3. If your change spans files, start at `effects/CONTEXT.md` instead.
4. Change the code the card cites. If the card is wrong, fix it in the same commit.

## Outputs

Your change, plus any card whose claims it invalidated.

## Human check

Follow one `See` link. It must land on source, not on another document.

## Layout

| Path | Holds |
|---|---|
| `objects/_index.md` | one line per noun — start here |
| `objects/<cluster>/` | noun cards: `wind`, `v1-scene`, `v2-layers`, `pipeline`, `repo` |
| `processes/` | the movements that repeat: render a frame, prepare assets, compare against the reference |
| `effects/CONTEXT.md` | "I am changing X — what moves?", plus what points INTO the tree from outside |
| `_meta/schema.md` | the closed set of node types and frontmatter |
| `_templates/` | blank object and process cards — new cards are a copy |
