# Autonomous run 6 status

## Current
Step: Step 1, price realism (tuning P2/T7, round 1 of 2: bot fix)
Last commit: 0549aef Plan 6 step 1, bot round 1: price every season by its calendar load
Next action: Read ../founder-mode-plan6-state/step1-r1/<scenario>-long/comparison.json (careful only).
Compare with price-blind from step1a (unchanged by the bot fix). Decide round 2, then run
all strategies once per scenario (playability), fix long.test.ts fingerprints, pnpm seeds,
tag plan6-price. Then merge branch plan6-step2 into main and continue step 2.

## Checklist
- [x] Step 0: set up (tag plan6-baseline)
- [ ] Step 1: price realism (tag plan6-price)
- [ ] Step 2: second sites, second boats, fleet engine (tag plan6-engine)
- [ ] Step 3: stages per scenario (tags plan6-<scenario>, then plan6-stages)
- [ ] Step 4: wrap up (tag plan6-complete)

## Running jobs and state
Bot runs use a run checkout: ../founder-mode-plan6-run (git worktree, detached).
It is checked out at the commit being measured by the run script.
Harness: packages/bots/scratch/plan6-main.tmp.ts (ignored; copy in both checkouts).
Results: ../founder-mode-plan6-state/<label>/<scenario>-<mode>/ (comparison.json, main.md).
Running: run-step1-r1.sh (careful bot, 10 bookings scenarios), progress in step1-r1.progress.

Branch plan6-step2 (commit 1684d2b): step 2 engine work in progress, parked until step 1 is tagged.
Its tests: packages/engine/test/secondSites.test.ts (10 pass).

Known red tests on main (expected until step 1 ends):
the three tourism fingerprints in packages/engine/test/long.test.ts and the docs/seeds.md examples.

## Step 1 results so far (1,000 test seeds, main part)
Protected proof at 86cddc7: Kantino 11/11, Zollstock 11/11, Kantino long 24/24 identical.
step1a (86cddc7), careful / price-blind / T7 (baseline T7):
- gratwanderung 49.0 / 51.8 / -2.8 (+1.0)
- hinterhof 33.2 / 38.0 / -4.8 (+5.5)
- seeblick 34.6 / 37.5 / -2.9 (+5.7)
- rueckenwind 46.9 / 52.8 / -5.9 (-0.7)
- tiefgang 32.9 / 35.9 / -3.0 (+3.7)
- leinenlos 51.8 / 53.4 / -1.6 (-0.2)
- ausgesperrt 44.4 / 50.7 / -6.3 (+1.3)
- fabriketage 38.2 / 38.3 / -0.1 (-1.0)
- schweissperle 55.1 / 59.0 / -3.9 (-3.3)
- griffig 51.0 / 49.8 / +1.2 (+0.5)
Reading: starting prices sit at 86 to 99% of what guests pay, so price-blind gains volume;
careful priced at the hints regardless of load. Round 1 prices every season by its load.
Pre-existing: Schweissperle careful 55.7% and Griffig boulder_first 70.7% at baseline.

## Baseline
Results committed at tuning2-complete. Nothing rerun.
Leisure scenarios: docs/tuning2/measurements/final-*.md and docs/tuning2/proof/final-main-manifest.json.
Other scenarios: docs/balancing.md.

## Open issues
None yet.

## For Henry to review (non-blocking)
- Stale plan 5 worktrees under /private/tmp are listed as prunable; not mine, left alone.

## Stopped
