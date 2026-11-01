# Autonomous run 6 status

## Current
Step: Step 1, price realism: all-strategy run (f4d3b3b) finishing; value round 1 queued (23f0483)
Last commit on main: 23f0483 value round 1, clamp top 1.1 in Gratwanderung, Rueckenwind, Leinen los
Next action: step 3, Tiefgang. Rückenwind done (reports/step3-rueckenwind.md, tag
plan6-rueckenwind). Offer check done for Tiefgang: careful gets the harbour base offer in 19 of 20
seeds. Measure with careful, never_move, always_move, never_second, always_second on 1,000 seeds
(baseline label step1-full), compute O1, O2, E1 (e1.py), S1 and B1 (targets6.py), tune at most 2
rounds each, then the full strategy set, pnpm seeds, tests, lint, report, tag plan6-tiefgang.
Then in order: Leinen los, Ausgesperrt, Fabriketage, Schweisperle, Griffig.

## Checklist
- [x] Step 0: set up (tag plan6-baseline)
- [x] Step 1: price realism (tag plan6-price, report reports/step1-price.md)
- [x] Step 2: second sites, second boats, fleet engine (tag plan6-engine, report reports/step2-engine.md)
- [ ] Step 3: stages per scenario (tags plan6-<scenario>, then plan6-stages)
- [ ] Step 4: wrap up (tag plan6-complete)

## Running jobs and state
Bot runs use a run checkout: ../founder-mode-plan6-run (git worktree, detached), checked out by
each run script at the commit it measures. Harness: packages/bots/scratch/plan6-main.tmp.ts
(ignored; copy in both checkouts). Diagnostics: packages/bots/scratch/diag.tmp.ts (300 seeds).
Results: ../founder-mode-plan6-state/<label>/<scenario>-<mode>/ (comparison.json, main.md, targets.json).
Summaries: `python3 summfull.py <label>` (careful, blind, T7, top) and
`python3 targets6.py <label> <scenario>` (playability, S1/B1 pairs, every report target).
Running: run-step1-full.sh (all strategies, 10 bookings scenarios, f4d3b3b).

Branches (all local, never pushed):
- main: step 0 and step 1.
- plan6-step2: step 2 engine, UI, tests (packages/engine/test/secondSites.test.ts) and shared
  bot rules (never_second, always_second, gear, boat purchase, run result fields).
  Its tourism.ts still has step 1's round 1 pricing: on merge keep main's round 2 block.
- plan6-step3: plan6-step2 plus draft content for all seven scenarios: stages 3 to 5 (Leinen
  los 2 to 4 plus the second gulet as an asset), offers, 21 drawings, Rueckenwind's rescue boat
  purchase and gear wear, Tiefgang's second boat, the office browser test extended (not run).
  Content tests pass. Engine tests packages/engine/test/rueckenwindStages.test.ts pass.
  Not measured. Other scenarios' stage tests still to write.

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
- rueckenwind 49.7 / 52.8 / -3.1 / price_blind 52.8
- tiefgang 36.0 / 35.9 / +0.1 / naive_careful 38.4
- leinenlos 49.5 / 53.4 / -3.9 / price_blind 53.4
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
