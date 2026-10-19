# Autonomous run 5 status

## Current

Step: 1.2 membership and instructor lifecycle complete; shared engine step remains in progress.
Last commit: HEAD, Plan 5: membership departures and observable event conditions.
Next action: Complete aggregator lifecycle/cannibalisation tests, slot-level newly rejected requests, indoor course/return slot handling and factual ladder totals, the slot calendar, and remaining freshness/hold/build tests. Then run full pnpm test and pnpm lint and prove all nine protected main reports unchanged (1,000 seeds, prefix test) before tagging plan5-engine. Source is integrated; /tmp drafts are stale. Research: /tmp/plan5-research-notes.md. Full bot report only in step 6.

## Checklist

- [x] Step 0: set up and baseline (tag plan5-baseline)
- [ ] Step 1: shared engine additions (tag plan5-engine)
- [ ] Step 2: Ausgesperrt (tag plan5-escape)
- [ ] Step 3: Fabriketage (tag plan5-venue)
- [ ] Step 4: Schweißperle (tag plan5-fitness)
- [ ] Step 5: Griffig (tag plan5-climbing)
- [ ] Step 6: wrap up (tag plan5-complete)

## Open issues

No new scenario targets measured yet. Current lint/typechecks pass; 23 leisure tests and all four bot condition tests pass. All 181 active content tests passed at the foundation checkpoint. The other 66 non-browser files passed before the two repaired assertions; full phase checks and bot comparisons remain pending. The full bot report is reserved for step 6, once.

## For Henry to review (non-blocking)

- Step 1: lead freelance instructors stand for role-level followings; agreed contract prices stay fixed, and intro conversion preserves signup cohorts. See docs/decisions.md, Plan 5 step 1.

- Step 1: four-week billing, 52-week annual terms, paid-at-start builds, bank reimbursement and cumulative setting work. See docs/decisions.md, Plan 5 step 1.

- Step 0: all nine content/save fingerprints are now captured, alongside the required main-part baselines (1,000 seeds, test). See docs/decisions.md, Plan 5 step 0.

- Step 0: formatting only in three pre-existing files; no game values changed. See docs/decisions.md, Plan 5 step 0. Browser tests require local server permission; initial checks passed (1,396 tests, 18 skipped; lint and typechecks).

## Stopped

