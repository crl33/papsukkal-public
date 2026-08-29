# 40-decisions — why it is built this way

One job: stop good ideas from being relitigated, and make it obvious when one
should be.

## Inputs

- Reference (every run): the existing decision records here
- Working (this run): the tradeoff you are about to make

## Process

1. Before changing architecture, read the records. Several obvious improvements
   are already refused here, with reasons.
2. If you are making a call another agent could plausibly reverse, write a
   record: `NNNN-slug.md` from `_template.md`.
3. Every record states **what would reverse it**. A decision with no reversal
   condition is dogma, not engineering.

## Outputs

- One numbered record per decision. Records are append-only: to change a
  decision, write a new record that supersedes the old one by number and edit
  the old one's `status:` to `superseded-by: NNNN`.

## Human check

Read the record's reversal condition. If you cannot imagine evidence that would
satisfy it, the record is not falsifiable — rewrite it.
