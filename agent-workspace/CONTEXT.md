# The workspace — what the numbers mean

The flow in one line: **know what you are aiming at (00–10), know how you will
check (20), try something (30), write down what it cost (40), leave the next
agent oriented (90).**

| Folder | Job | Reads | Writes | Human check |
|---|---|---|---|---|
| `00-context` | orient: versions, names, rules, code map | the repo | nothing (factory) | can a cold agent find the right file in two hops? |
| `10-reference-analysis` | state the target as measurable facts | the reference photograph | nothing (factory) | do the stated targets match what you see in the photo? |
| `20-visual-gates` | define and run the checks | `10-reference-analysis` | gate output in `../versions/*/shots/` | did you actually run them, or assume? |
| `30-experiments` | record attempts and outcomes | the gates | one file per experiment | does the entry say what the numbers were, not just the intent? |
| `40-decisions` | record why, so it is not relitigated | experiments | one file per decision | is the decision falsifiable — does it say what would reverse it? |
| `90-current-state` | hand off | everything above | status + next three fixes | would a cold agent know what to do next? |

Numbering is sequence, not priority. `00–20` are **factory**: stable across
runs, they configure what "good" means. `30–90` are **product**: they accumulate
as work happens. A gap of ten between numbers is deliberate — new stages insert
without renumbering.

## Load only what the step needs

An agent doing art-direction work reads: this file + `90-current-state/` +
`10-reference-analysis/` + the one gate it is about to run. That is the healthy
context load. Do not read `30-experiments/` end to end — search it for the thing
you are about to try, so you do not repeat a known failure.

## Status is what exists

There is no status field to maintain. `30-experiments/` shows what has been
tried; `90-current-state/` shows where it stands. If they disagree, the
experiments are the record and current-state is stale.
