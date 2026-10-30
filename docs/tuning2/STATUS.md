# Tuning run 2 status

## Current
Step: 0, setup.
Last commit: pending setup commit.
Next action: Profile the slowest policy of each leisure scenario on 100 test seeds.
Record the ten largest CPU costs before changing engine or bot code.

## Checklist
- [ ] Step 0: set up (tag tuning2-start)
- [ ] Step 1: speed (tag tuning2-speed)
- [ ] Step 2: shared leisure patterns (tag tuning2-shared)
- [ ] Step 3: Ausgesperrt, Fabriketage, Schweißperle, Griffig (tag tuning2-scenarios)
- [ ] Step 4: wrap up (tag tuning2-complete)

## Running jobs and state
No run-owned jobs running.
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

## Stopped
