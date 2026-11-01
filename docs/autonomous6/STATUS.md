# Autonomous run 6 status

## Current
Step: Step 3, leisure scenarios: Fabriketage full set running
Last commit on main: (this commit) Plan 6 step 3: leisure full sets and three reports
Next action: when run-fb-full.sh finishes (progress ../founder-mode-plan6-state/fb-full.progress,
label leis-full): python3 cmp.py leis-full/fabriketage-long step1-full/fabriketage-long and
targets6.py leis-full fabriketage; write reports/step3-fabriketage.md; then pnpm seeds, pnpm test,
pnpm lint, fill CHECKS in the four leisure reports, commit, tags plan6-ausgesperrt,
plan6-fabriketage, plan6-schweissperle, plan6-griffig, then plan6-stages. Then step 4.

## Checklist
- [x] Step 0: set up (tag plan6-baseline)
- [x] Step 1: price realism (tag plan6-price, report reports/step1-price.md)
- [x] Step 2: second sites, second boats, fleet engine (tag plan6-engine, report reports/step2-engine.md)
- [ ] Step 3: stages per scenario (tags plan6-<scenario>, then plan6-stages)
  - [x] Rueckenwind, Tiefgang, Leinen los (tags made, reports written)
  - [ ] Ausgesperrt, Schweissperle, Griffig: measured, reports drafted, checks and tags pending
  - [ ] Fabriketage: E1 round 1 met (week 57); full set running
- [ ] Step 4: wrap up (tag plan6-complete)

## Running jobs and state
Bot runs use a run checkout: ../founder-mode-plan6-run (git worktree, detached), checked out by
each run script at the commit it measures. Harness: packages/bots/scratch/plan6-main.tmp.ts
(ignored; copy in both checkouts).
Results: ../founder-mode-plan6-state/<label>/<scenario>-<mode>/ (comparison.json, main.md, targets.json).
Summaries: summfull.py <label>, targets6.py <label> <scenario>, e1.py <label> <scenario>,
cmp.py <dir> <base dir>.
Running: run-fb-full.sh (Fabriketage all strategies at f9fb82d, label leis-full).
All step branches are merged into main; nothing is pushed.

## Step 3 leisure results (1,000 test seeds, main part, long mode)
careful / never_move / always_move, E1:
- ausgesperrt 43.0 / 43.4 / 9.3, E1 met (week 70)
- fabriketage (leis-m1) 39.5 / 39.5 / 0.0; E1 round 1 met (fb-r1: week 57)
- schweissperle 55.1 / 55.0 / 0.0, E1 met (week 65)
- griffig 46.3 / 44.1 / 37.1, E1 met (week 69); boulder_first 71.3 (pre-existing, see decisions)
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
