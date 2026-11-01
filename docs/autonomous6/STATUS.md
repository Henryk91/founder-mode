# Autonomous run 6 status

## Current
Step: Step 1, price realism (built, measuring)
Last commit: 86cddc7 Plan 6 step 1: price elasticity, shoulder prices and season lines
Next action: Read the step1a results (careful and price-blind, 10 bookings scenarios; protected proof).
Then tune P2/T7 and playability, run all strategies once per scenario,
update the three tourism fingerprints in long.test.ts, run pnpm seeds, and tag plan6-price.

## Checklist
- [x] Step 0: set up (tag plan6-baseline)
- [ ] Step 1: price realism (tag plan6-price)
- [ ] Step 2: second sites, second boats, fleet engine (tag plan6-engine)
- [ ] Step 3: stages per scenario (tags plan6-<scenario>, then plan6-stages)
- [ ] Step 4: wrap up (tag plan6-complete)

## Running jobs and state
Bot runs use a run checkout: ../founder-mode-plan6-run (git worktree, detached).
It must be at the commit being measured (git -C ../founder-mode-plan6-run checkout --detach <hash>).
Harness: packages/bots/scratch/plan6-main.tmp.ts (ignored; copy in both checkouts).
Results: ../founder-mode-plan6-state/<label>/<scenario>-<mode>/ (comparison.json, main.md).
Running: ../founder-mode-plan6-state/run-step1a.sh, progress in step1a.progress.

Known red tests at 86cddc7 (expected until step 1 ends):
the three tourism fingerprints in packages/engine/test/long.test.ts and the docs/seeds.md examples.

## Baseline
Results committed at tuning2-complete. Nothing rerun.
Leisure scenarios: docs/tuning2/measurements/final-*.md and docs/tuning2/proof/final-main-manifest.json.
Other scenarios: docs/balancing.md.

## Open issues
None yet.

## For Henry to review (non-blocking)
- Stale plan 5 worktrees under /private/tmp are listed as prunable; not mine, left alone.

## Stopped
