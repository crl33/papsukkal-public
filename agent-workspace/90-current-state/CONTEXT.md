# 90-current-state — the handoff

One job: a cold agent reads this folder and knows what to do next.

## Inputs

- Reference: `../30-experiments/` (what has been tried), `../20-visual-gates/`
- Working: `status.md`, `next-three.md`

## Process

1. Read `status.md` — where each version stands and what the last measurements were.
2. Read `next-three.md` — the ranked open gaps.
3. Do the work. Run the gates.
4. **Before you finish, update both files.** This is the deliverable of every
   session, not an optional courtesy.

## Outputs

- `status.md` and `next-three.md`, current as of your last commit.

## Human check

Would someone with no memory of this project know what to pick up? If not, the
handoff failed regardless of what else got done.
