# Autonomous run 5 status

## Current

Step: 1.5 slot calendar and indoor course handling complete; engine verification in progress.
Last commit: HEAD, Plan 5: slot calendar and indoor course progression.
Next action: Finish full-suite verification (/tmp/plan5-step1-full-test.log, session 54415) and nine protected main comparisons (/tmp/plan5-protected-step1.log, scheduler session 23844). Check fingerprints, write the step 1 report and tag plan5-engine before starting Ausgesperrt. Full bot report only in step 6.

## Checklist

- [x] Step 0: set up and baseline (tag plan5-baseline)
- [ ] Step 1: shared engine additions (tag plan5-engine)
- [ ] Step 2: Ausgesperrt (tag plan5-escape)
- [ ] Step 3: Fabriketage (tag plan5-venue)
- [ ] Step 4: Schweißperle (tag plan5-fitness)
- [ ] Step 5: Griffig (tag plan5-climbing)
- [ ] Step 6: wrap up (tag plan5-complete)

## Open issues

No new scenario targets measured yet. Current lint/typechecks pass; 34 leisure and 18 course tests pass. Full suite and main-only protected comparisons are running. The full bot report is reserved for step 6, once.

## For Henry to review (non-blocking)

- Step 1: lead freelance instructors stand for role-level followings; agreed contract prices stay fixed, and intro conversion preserves signup cohorts. See docs/decisions.md, Plan 5 step 1.

- Step 1: four-week billing, 52-week annual terms, paid-at-start builds, bank reimbursement and cumulative setting work. See docs/decisions.md, Plan 5 step 1.

- Step 0: all nine content/save fingerprints are now captured, alongside the required main-part baselines (1,000 seeds, test). See docs/decisions.md, Plan 5 step 0.

- Step 0: formatting only in three pre-existing files; no game values changed. See docs/decisions.md, Plan 5 step 0. Browser tests require local server permission; initial checks passed (1,396 tests, 18 skipped; lint and typechecks).

## Stopped

