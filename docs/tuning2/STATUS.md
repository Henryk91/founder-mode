# Tuning run 2 status

## Current
Step: 1, prepare second and final speed round.
Last commit: 4999353, record 87000 identical leisure outcomes during speed validation.
Next action: Commit the verified first optimisation, then apply the prepared second round.
Run engine tests and lint before any more bots.
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
No active jobs. Main campaign 53447 and engine test session 86283 exited 0.
Driver: docs/tuning2/state/round1-main.sh.
Checkpoint source is pinned in state/round1/<scenario>-long/source.json.
Logs: state/round1-<scenario>.log. No tests or browser jobs may run concurrently.
Profiling complete: four policies, 100 seeds each; ten CPU costs in reports/step1-speed.md.
Tools: packages/bots/scratch/tuning2-{profile,timings,main}.tmp.ts.
Completed proof hashes: proof/round1-<scenario>.json, all four units.
Original engine source for save/replay comparison: state/baseline-engine/ (plan5-complete).
Saved action logs and state hashes: state/replays/; runner: scratch/tuning2-replay.tmp.ts.
Read-only Part B findings: state/step2-preparation.md (no changes applied).
State and profiles: docs/tuning2/state/ (ignored local artifacts).
Baseline: plan5-complete, docs/balancing.md and docs/autonomous5/.
No baseline rerun. No full report started.
Preconditions passed: plan5-complete exists; tuning2-start does not exist.
Existing edits are the tuning plan and the backlog price-realism note; preserve both.

## Open issues
34 first-pass targets: Ausgesperrt 8, Fabriketage 6, Schweißperle 8, Griffig 12.
Details and closest results: docs/BACKLOG.md, section 3.
Speed also measures Ausgesperrt and Fabriketage, whose final report timings exceed T12.
All tuning budgets unused: up to 3 value rounds, then 2 formula rounds per target.
Per-target budget and closest baseline evidence: BUDGET.json.
Speed budget: first round verified; second/final round prepared, not applied.

## For Henry to review (non-blocking)
- Content-entry memoisation verified on 119,000 outcomes and 21 saved states.
- Final speed round removes duplicate availability/room evaluation; decisions, Tuning 2 step 1.

## Stopped
