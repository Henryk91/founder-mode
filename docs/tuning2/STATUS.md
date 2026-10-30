# Tuning run 2 status

## Current
Step: 1, speed profiling.
Last commit: 1c07182, start tuning plan 2 with preserved plan 5 baseline.
Next action: Implement speed round 1: memoise sorted immutable content entries.
Then compare complete affected main results on 1,000 seeds and replay saves.

## Checklist
- [x] Step 0: set up (tag tuning2-start)
- [ ] Step 1: speed (tag tuning2-speed)
- [ ] Step 2: shared leisure patterns (tag tuning2-shared)
- [ ] Step 3: Ausgesperrt, Fabriketage, Schweißperle, Griffig (tag tuning2-scenarios)
- [ ] Step 4: wrap up (tag tuning2-complete)

## Running jobs and state
No run-owned jobs running.
Profiling complete: four policies, 100 seeds each; ten CPU costs in reports/step1-speed.md.
Tools: packages/bots/scratch/tuning2-profile.ts and tuning2-timings.ts.
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
Speed budget: 2 honest rounds per slow scenario.

## For Henry to review (non-blocking)
- Profile-driven content-entry memoisation proposed; decisions, Tuning 2 step 1.

## Stopped
