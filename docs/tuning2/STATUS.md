# Tuning run 2 status

## Current
Step: 1, final speed-source earlier-game proof.
Last commit: 12d1beb, preserve final speed-source proofs for escape venue and fitness.
Next action: Finish the remaining earlier-game main comparisons.
After all bot jobs exit, measure leisure T12 serially on the actual slowest policies.
Round 2 leisure proof complete: 119 policies, all 119,000 results identical.
Kantino standard also complete: 11 policies, 11,000 results identical.
Kantino long active; the remaining seven earlier units follow.
Ausgesperrt complete: all 28 policies / 28,000 results exactly match baseline.
Fabriketage complete: all 29 policies / 29,000 results exactly match baseline.
Schweißperle complete: all 30 policies / 30,000 results exactly match baseline.
Griffig complete: all 32 policies / 32,000 results exactly match baseline.
Round 1 main proof complete: 119 policies, 119,000 identical results.
Broader engine checks: 517 tests passed in 57 files; no bot overlap.
Focused leisure/qualification tests: 53 passed; pnpm lint passed.
Original-save comparison: 21 full states across all 13 units replay identically.

## Checklist
- [x] Step 0: set up (tag tuning2-start)
- [ ] Step 1: speed (tag tuning2-speed)
- [ ] Step 2: shared leisure patterns (tag tuning2-shared)
- [ ] Step 3: Ausgesperrt, Fabriketage, Schweißperle, Griffig (tag tuning2-scenarios)
- [ ] Step 4: wrap up (tag tuning2-complete)

## Running jobs and state
Active: round 2 main campaign, session 8532, one scenario process, eight workers.
Driver: state/round2-main.sh. All 13 units, main only, 1,000 paired test seeds.
Budget check: engine changes require this proof; no wide seeds or events.
Do not run tests or browser jobs while the campaign runs.
Second round: all 518 engine tests, lint, 21 original-state replays pass.
Three 100-seed profiles also reproduce every complete result.
Completed first driver: docs/tuning2/state/round1-main.sh.
Checkpoint source: state/round2/<scenario>-<mode>/source.json.
Completed first-round checkpoints: state/round1/<scenario>-long/.
Current logs: state/round2-<scenario>-<mode>.log.
Initial profiling: four policies, 100 seeds each; ten CPU costs in reports/step1-speed.md.
Tools: packages/bots/scratch/tuning2-{profile,timings,main}.tmp.ts.
Additional diagnostics there: tuning2-{replay,replay-saved,t12,baselines}.tmp.ts.
All 314 saved main baselines exist; metadata check played no games.
Completed proof hashes: proof/round1-<scenario>.json, all four units.
Original engine source for save/replay comparison: state/baseline-engine/ (plan5-complete).
Saved action logs and state hashes: state/replays/; runner: scratch/tuning2-replay.tmp.ts.
Read-only Part B findings: state/step2-preparation.md (no changes applied).
State and profiles: docs/tuning2/state/ (ignored local artifacts).
Baseline: plan5-complete, docs/balancing.md and docs/autonomous5/.
No baseline rerun. No full report started.
At setup, plan5-complete existed and tuning2-start was absent.
The tuning2-start tag now exists and this plan is in progress.
Existing edits are the tuning plan and the backlog price-realism note; preserve both.

## Open issues
34 first-pass targets: Ausgesperrt 8, Fabriketage 6, Schweißperle 8, Griffig 12.
Details and closest results: docs/BACKLOG.md, section 3.
Speed also measures Ausgesperrt and Fabriketage, whose final report timings exceed T12.
All tuning budgets unused: up to 3 value rounds, then 2 formula rounds per target.
Per-target budget and closest baseline evidence: BUDGET.json.
Speed budget: first round verified; second/final round applied, main proof running.

## For Henry to review (non-blocking)
- Content-entry memoisation verified on 119,000 outcomes and 21 saved states.
- Final speed round removes duplicate availability/room evaluation; decisions, Tuning 2 step 1.

## Stopped
