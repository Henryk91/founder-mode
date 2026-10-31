# Tuning run 2 status

## Current
Step: Finish invitation timing, then Henry's three remaining goals.
Last commit: 33f0b1c, tested first-full-week invitations and Henry scope amendment.
Next action: Run the final four leisure main matrices, then the nine protected units once.
Henry's 31 October scope replaces the broader plan: at most two further rounds
per goal, including bot changes. No event tables or full report.

## Active goals
- Fabriketage: weddings-viable wins >=20% (prior candidate 3.8%).
- Ausgesperrt X1: quarterly new rooms must not be the best strategy
  (prior candidate quarterly 51.8%, careful 40.1%).
- Griffig: careful wins >=25% (prior candidate 26.5%).
All other open targets are LOW priority in docs/BACKLOG.md.
Counters and historical budgets: BUDGET.json; Henry amendment takes precedence.

## Checklist
- [x] Setup: tuning2-start.
- [x] Speed: tuning2-speed, two rounds exhausted.
- [x] Invitation timing fix with tests.
- [ ] Three narrowed goals, at most two further rounds each.
- [ ] Four leisure main matrices on 1,000 seeds once at the end.
- [ ] Nine earlier games unchanged once at the end (engine changed).
- [ ] Short final report and annotated tuning2-complete tag.

## Running jobs and state
Bot jobs finished; no bot or browser/test jobs may overlap.
Griffig invitation-fix careful reference: 463/1,000 wins (46.3%), session 76827 exited 0.
Venue and escape narrowed round 1: 82 focused bot tests and lint pass.
Main-only measurements now running: V careful then E careful/quarterly, 1,000 seeds each.
Logs: state/narrowed-r1-<scenario>.log; checkpoints state/narrowed-r1/.
Round 1 finished; all jobs exited. Weddings 10.1%; E C46.2/Q51.8/PT52.3.
Final allowed V/E round implemented; no third round. Griffig needs no tuning.
Final gate: pnpm test passes (1,992 passed, 30 skipped), lint/typechecks pass.
Seeds regenerated: 225 examples. All tests exited before starting bot jobs.
Final logs: state/narrow-final-tests.log, narrow-final-lint.log, narrow-final-seeds.log.
After gates: final four leisure main matrices once, then nine protected units once.
Seed regeneration finished: 225 examples, only fitness/climbing rows changed.
Lint/typechecks pass: state/opening-final-lint.log.
Focused invitation tests: 6 engine +4 content pass.
Full web gate: 27 files pass; saves browser setup timed out before assertions.
Saves retry and all non-web tests pass: 1,990 passed, 30 skipped in total.
Session 84618 exited 0; no bot/test jobs remain active.
Logs: state/opening-final-tests.log, opening-saves-retry.log, opening-rest-tests.log.
Four prefixes prove queued invitations remain through construction completion
and release in the next full week with normal prices and capacity.
Proof: proof/opening-invitation-first-full-week.json.
Original bug proof: proof/opening-invitation-timing.json.
No protected main proof or final leisure main run started under the new scope.

## Preserved historical evidence
Shared1 main: all 119 leisure policies x1,000 seeds; nine protected units
195,000 identical outcomes. proof/shared1-main-manifest.json.
Shared2 main: fitness/climbing 62 policies x1,000 plus E/V careful references.
proof/shared2-main-manifest.json; measurements/shared2-*.md.
Shared2 source: e932b7d232ab590b5fbee2a9afd217c771fb4ab259ce08efc31f0e1d03cf1bd5.
Shared1 source: a0a325a9e7978c04787ee556416217f01f5b50f0c76d4198054efef26bc70b17.
Prior gate: 1,979 passed, 30 skipped; lint/typechecks passed.
Historical completed escape/venue event tables remain in measurements/ and proof/.
Fitness events stopped at 60/119; climbing events never started.
Do not resume event jobs or use historical candidate results as final-source proof.
No wide seeds or full report run in tuning2.

## Working paths
All checkpoints, diagnostics and logs: docs/tuning2/state/ (ignored).
Current timing prefixes: state/opening-invite-trace/openingfix2/.
Prior candidates: state/shared1/, state/shared2/, state/events-shared2/.
Protected baseline: state/round2/ (all 314 main tasks), tuning2-speed.
Scratch tools: packages/bots/scratch/tuning2-*.tmp.ts (ignored).
No worktrees, branches or /tmp working state created. Never push.

## For Henry to review (non-blocking)
- Scope amendment is recorded in the plan and decisions.md; other targets LOW priority.
- First full week release leaves a planning turn after construction finishes.
- Invitation counts/costs unchanged; capacity may still refuse visitors.
- Speed remains open for fitness/climbing after the two-round cap.

## Stopped
