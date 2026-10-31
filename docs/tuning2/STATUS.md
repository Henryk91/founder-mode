# Tuning run 2 status

## Current
Step: 2, corrections validated; shared2 measurement next.
Last commit: 15648a9, record shared leisure targets and protected game proof.
Next action: Run state/shared2-main.sh, then state/shared2-events.sh.
Measure only affected main matrices and identical-source event references.
The capped-contact audit was incorrect; invitations add booking requests directly.
No saturation guard is retained. Five fitness yoga targets are corrected.
Correction source SHA256: e932b7d232ab590b5fbee2a9afd217c771fb4ab259ce08efc31f0e1d03cf1bd5.
Shared1 SHA256: a0a325a9e7978c04787ee556416217f01f5b50f0c76d4198054efef26bc70b17.
Previous candidate gate: 1,980 pass, 30 skipped.
Corrections: 104 focused bot tests pass; all leisure guest targets validated.
Final correction gate: 1,979 passed, 30 skipped; lint/typechecks pass.
Logs: state/step2-botfix-full-tests.log, step2-botfix-final-lint-2.log.

Escape complete, 28 policies: careful 40.1%; T10 passes, T6/T15 still fail.
Regressions: X1 quarterly +11.7 ±2.5; T16 overborrow -0.1 ±2.8.
Venue complete, 29 policies: careful 33.8%; T13 passes, T15 +11.0 still fails.
Weddings 3.8%; T3/T6/T11/T14 still fail. No new venue regressions.
Shared1 fitness, 30 policies: careful 47.8%; T5 passes, T6 at the limit.
T3/T7/T12/T14/F3/F4 remain open; ticket setting reverted; new measurement pending.
Shared1 climbing, 32 policies: careful 25.4%; T3/K2 at the limit, T5 passes.
T6 fails at reading -1.9 ±1.8; T7/T9/T11/T12/T14/T15/K1/K3 still fail.
Corrected audit: eventGuests adds requests independently of capped repeat reach.
All 119 leisure policies complete, 119,000 paired games.
All nine protected units completed: 195,000 complete results identical.
Manifest: proof/shared1-main-manifest.json. No candidate target is final yet.

## Checklist
- [x] Step 0: set up (tag tuning2-start)
- [x] Step 1: speed (tag tuning2-speed)
- [ ] Step 2: shared leisure patterns (tag tuning2-shared)
- [ ] Step 3: Ausgesperrt, Fabriketage, Schweißperle, Griffig (tag tuning2-scenarios)
- [ ] Step 4: wrap up (tag tuning2-complete)

## Running jobs and state
Completed: main campaign session 42606 exited 0.
Seed regeneration session 55004 exited 0: 224 examples, older rows unchanged.
Full tests session 96499 exited 0; no active jobs before measurement.
Stopped superseded seed session 65812 before the last two target corrections.
Completed driver: state/shared1-main.sh.
Next drivers: state/shared2-main.sh, state/shared2-events.sh.
Logs: state/shared1-<scenario>-<mode>.log.
Checkpoints/targets: state/shared1/<scenario>-<mode>/.
Do not run tests or browser jobs during bot/event campaigns.
Source freeze for shared1 ended after all 13 units completed.
Baseline: tuning2-speed, state/round2/ (all 314 saved main tasks).
Full report not started. No wide seeds or event tables run in this campaign.
Event driver prepared, inactive: state/shared2-events.sh.
The corrected source needs a fresh careful reference before forcing event choices.
Next checkpoints: state/shared2/ and state/events-shared2/, guarded by source.

Source gate: state/step2-shared-full-tests-2.log, step2-shared-final-lint.log.
224 ending examples regenerated; every earlier-game row is unchanged.
Review-bot isolation: state/review-fix/; proof/review-fix-<scenario>.json.
Loan scope examples: state/loan-scope/ (24 games, not a target estimate).
Fitness trace 16411 exited: 16 games, state/fitness-trace/shared1/.
These save weekly timing/cohorts missing from main aggregates; no target claim.
Read-only follow-up notes: state/step3-readonly-notes.md.
Event inventory: proof/context-events-round1.json (40 rewrites, 10 new cards).
Measurements: measurements/shared1-<scenario>.md; proof/shared1-*.json.

Run-owned scratch tools: packages/bots/scratch/tuning2-*.tmp.ts.
Names: profile, timings, main, replay, replay-saved, t12, baselines,
review-fix, loan-scope, shared-main, events, fitness-trace.
All working state is under docs/tuning2/state/, never /tmp.
No worktrees or branches created. Earlier run state remains untouched.

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
