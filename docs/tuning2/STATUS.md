# Tuning run 2 status

## Current
Step: Complete within Henry's narrowed scope and tuning caps.
Last commit: tuning2-complete (final report/proof commit; resolve the annotated tag).
Final source commit: 9c2c36a.
Next action: None in this run. Weddings and X1 uncertainty remain recorded after the cap.
Full report skipped; no event tables under the scope amendment.

## Results
- Invitation timing fixed and tested: release once in the first full week open.
- Fabriketage weddings: 33/318 (10.4% +/-3.4), below 20%; 2/2 rounds spent.
- Ausgesperrt: tourism_part_time 52.3%, quarterly 51.8%; paired gap +0.5 +/-2.3 points; quarterly second, inconclusive; 2/2 rounds spent.
- Griffig careful: 463/1000 (46.3% +/-3.1), above 25%; 0/2 extra rounds.
- Every other open target: LOW priority in docs/BACKLOG.md.

## Verification
- pnpm test: 1,992 passed, 30 skipped; lint/typechecks pass.
- Closing gate logs: state/completion-tests.log and state/completion-lint.log.
- pnpm seeds: 225 examples regenerated.
- Four leisure main matrices once: 119 policies x1,000 seeds =119,000 games.
- Nine earlier games proved unchanged once at the end: 195 policies x1,000
  seeds =195,000 complete results identical, excluding timings.
- All 13 units share source SHA256:
  a53aba3fb38cdc9036cc619ca74b16984c40ce260952c08429bf5a27249b779e.
- No wide seeds, event tables or full report under Henry's amendment.
- No bot/test/browser jobs remain active. Final gate sessions 89640/1572 exited 0.

## Checklist
- [x] Setup: tuning2-start.
- [x] Speed: tuning2-speed, two rounds exhausted.
- [x] Invitation fix, tests and public queued status.
- [x] Only the three remaining goals; venue/escape capped at two rounds each.
- [x] Other open targets deferred LOW priority.
- [x] Final four leisure main matrices once; no full report/event tables.
- [x] Nine earlier games unchanged once because engine changed.
- [x] Short final report and annotated tuning2-complete tag.

## Reports and proof
Report: reports/final.md.
Proof: proof/final-main-manifest.json, proof/final-narrowed-goals.json.
Final measurements: measurements/final-<scenario>.md.
Invitation proof: proof/opening-invitation-first-full-week.json.
Historical rounds remain in proof/ and measurements/; earlier event evidence
is historical and was not resumed under the amendment.

## Working state
Final driver session 5566 exited 0; all workers finished.
Checkpoints/logs: docs/tuning2/state/narrowed-final/ and state/final-*.log.
Ignored scratch tools: packages/bots/scratch/tuning2-*.tmp.ts.
No worktrees, branches or /tmp state created. Audit checkpoints retained.
Unrelated user plan documents left outside this run's commits.

## For Henry to review
- Weddings still below the requested floor after both allowed rounds.
- Quarterly is second by the point estimate, but the lead over it is inconclusive.
- Griffig floor passes and the invitation timing fix is covered by tests.
- All other open targets, including fitness/climbing speed, remain LOW priority.

## Stopped
No hard stop. Completed the authorised capped run; not all retained goals passed.
