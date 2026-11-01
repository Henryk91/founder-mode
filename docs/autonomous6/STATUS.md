# Autonomous run 6 status

## Current
Step: Step 1, price realism: measuring all strategies after bot round 2 (f4d3b3b)
Last commit on main: see git log (bot round 2 f4d3b3b, decisions 3cf4c71)
Next action: when ../founder-mode-plan6-state/step1-full.progress says ALLDONE, run
`python3 ../founder-mode-plan6-state/summfull.py step1-full` (careful, blind, T7, top strategy).
Then a value round for playability where careful is over 45% (Gratwanderung 50.0 so far):
lower that scenario's clamp max (300-seed diagnostic: max 1.2 cut careful about 2 points).
Then: fix the three tourism fingerprints in packages/engine/test/long.test.ts, `pnpm seeds`,
full `pnpm test` and `pnpm lint`, step 1 report, tag plan6-price.
Then merge plan6-step2 into main (keep main's round 2 pricing in tourism.ts on conflict),
run the step 2 protected proof (main part, every scenario), tag plan6-engine,
then merge plan6-step3 (Rueckenwind) and continue step 3.

## Checklist
- [x] Step 0: set up (tag plan6-baseline)
- [ ] Step 1: price realism (tag plan6-price)
- [ ] Step 2: second sites, second boats, fleet engine (tag plan6-engine)
- [ ] Step 3: stages per scenario (tags plan6-<scenario>, then plan6-stages)
- [ ] Step 4: wrap up (tag plan6-complete)

## Running jobs and state
Bot runs use a run checkout: ../founder-mode-plan6-run (git worktree, detached), checked out by
each run script at the commit it measures. Harness: packages/bots/scratch/plan6-main.tmp.ts
(ignored; copy in both checkouts). Diagnostics: packages/bots/scratch/diag.tmp.ts (300 seeds).
Results: ../founder-mode-plan6-state/<label>/<scenario>-<mode>/ (comparison.json, main.md).
Running: run-step1-full.sh (all strategies, 10 bookings scenarios, f4d3b3b).

Branches (all local, never pushed):
- main: step 0 and step 1.
- plan6-step2: step 2 engine, UI, tests (packages/engine/test/secondSites.test.ts) and shared
  bot rules (never_second, always_second, gear, boat purchase, run result fields).
  Its tourism.ts still has step 1's round 1 pricing: on merge keep main's round 2 block.
- plan6-step3: plan6-step2 plus Rueckenwind stages 3 to 5, second beach, rescue boat purchase,
  gear wear, office.yaml offers, three drawings. Not yet measured or tested in full.

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
Reading: starting prices sit at 86 to 99% of what guests pay, so price-blind gains volume.
Round 1 (calendar load) failed badly; diagnostics in docs/decisions.md; round 2 kept.
step1-full (f4d3b3b), careful / blind / T7 / top:
- gratwanderung 50.0 / 51.8 / -1.8 / seasonal 55.4
- hinterhof 36.4 / 38.0 / -1.6 / always_strict 39.3
- seeblick 36.2 / 37.5 / -1.3 / naive_careful 38.4
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
