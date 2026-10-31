# Tuning run 2 status

## Current
Step: 2, shared first draft implemented; validate before main measurements.
Last commit: tuning2-speed, finish speed proof and isolated timing gate.
Next action: Start state/shared1-main.sh on the committed shared draft.
Measure four leisure main matrices, then prove the nine earlier units unchanged.
1,980 full tests pass, 30 skipped; lint and all typechecks pass.
All 225 ending examples regenerated; earlier-game seed rows unchanged.
Leisure T6 confidence correction keeps all four baseline T6 failures open.
Speed gate: 1,963 tests pass, 30 skipped; lint and all typechecks pass.
Ausgesperrt candidates max 115.099 s; Fabriketage max 54.865 s.
Schweißperle 247.792 s and Griffig 292.426 s remain over T12 after two rounds.
Final speed source: all 13 units, 314 policies, 314,000 results identical.
Every comparison matches the current common source checksum.
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
- [x] Step 1: speed (tag tuning2-speed)
- [ ] Step 2: shared leisure patterns (tag tuning2-shared)
- [ ] Step 3: Ausgesperrt, Fabriketage, Schweißperle, Griffig (tag tuning2-scenarios)
- [ ] Step 4: wrap up (tag tuning2-complete)

## Running jobs and state
Completed: round 2 main campaign, session 8532 exited successfully.
Completed: serial T12 session 26715 exited successfully; no bot jobs active.
Completed: review-fix diagnostic 15868 and loan-scope trace 36712.
Latest validation sessions 81631/68270/22420 completed.
Completed: pnpm seeds, session 92983, exited 0.
Shared full gate attempt 2: session 43874 exited 0; lint 94922 exited 0.
Initial browser wording failures are fixed; no assertion weakened.
No active jobs. Source will be frozen for the main campaign.
Logs: state/step2-shared-seeds.log and state/step2-shared-full-tests-2.log.
Prepared runner: scratch/tuning2-shared-main.tmp.ts; syntax checked, no games started.
Only escape/venue review-blind policies, 1,000 test seeds; no tests overlap.
Venue payment setting removed in the review diagnostic to isolate the bot fix.
Loan scope: state/loan-scope/ (8 example seeds per scenario, not target estimates).
Event inventory: proof/context-events-round1.json (40 rewrites, 10 new prep cards).
Draft writer: state/rewrite-context-events.py; not needed by the game.
Review-blind deltas now escape -31.7 ±3.0, venue -31.2 ±2.9.
State: state/review-fix/; log: state/step2-review-fix.log.
Full speed pnpm test (session 11936) exited 0 after web then others.
Initial sandbox attempt could not bind browser ports; permitted run passes.
Log: state/step1-full-tests.log.
Timing evidence: proof/t12-<scenario>.json; raw state: state/t12-round2/.
Driver: state/round2-main.sh. All 13 units, main only, 1,000 paired test seeds.
Budget check: engine changes require this proof; no wide seeds or events.
Do not run tests or browser jobs during future bot/event campaigns.
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
T6 value round 1 in all four; T5 round 1 in fitness/climbing.
Venue T3 uses formula round 1 for advance accounting. Other budgets unused.
Numeric changes cannot implement a missing payment deadline or refund ledger.
Per-target budget and closest baseline evidence: BUDGET.json.
Speed budget: both rounds complete; no third round. Fitness/climbing T12 open.

## For Henry to review (non-blocking)
- Shared draft tested; target effects still pending. Decisions: Tuning 2 step 2.
- Fitness remains over T12 at 247.792 s after two speed rounds; step1-speed report.
- Content-entry memoisation verified on 119,000 outcomes and 21 saved states.
- Final speed round removes duplicate availability/room evaluation; decisions, Tuning 2 step 1.

## Stopped
