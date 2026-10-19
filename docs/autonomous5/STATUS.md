# Autonomous run 5 status

## Current

Step: 2.3.2 Careful bot responds to observable capacity pressure.
Last commit: HEAD, Plan 5: expand leisure rooms after repeated visible crowding.
Next action: Repair the leisure deposit-refund gap found by tracing the 85.7% understaffing result: cancelled bookings currently retain advances. Gate the repair to leisure, test refunds, then remeasure affected targets. Finish corrected main-only measurement (session 47891, /tmp/plan5-ausgesperrt-main-1.log, output tuning/ausgesperrt-main-1.md). Judge every T1–T18, E1, X1–X4 with margins and check bot behaviour before value tuning. UI and content in repo are authoritative; do not recopy /tmp drafts. Full bot report only in step 6.

## Checklist

- [x] Step 0: set up and baseline (tag plan5-baseline)
- [x] Step 1: shared engine additions (tag plan5-engine)
- [ ] Step 2: Ausgesperrt (tag plan5-escape)
- [ ] Step 3: Fabriketage (tag plan5-venue)
- [ ] Step 4: Schweißperle (tag plan5-fitness)
- [ ] Step 5: Griffig (tag plan5-climbing)
- [ ] Step 6: wrap up (tag plan5-complete)

## Open issues

No complete target measurement yet. First measurement was deliberately interrupted for a bot budgeting fix; see tuning/ausgesperrt-initial-interrupted.md. Current lint/typechecks pass; 30 leisure bot tests and all 172 seed tests pass. The full suite passed 78 files/1,508 tests with only missing new seed examples failing; generation and seed replay fixed that failure. All 24 leisure browser cases pass across three UI stages, four widths, Chromium/WebKit, axe and word checks. Screenshots: /var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-leisure. At step end, rerun the required full suite/lint, event table once, and nine protected main proofs. Full report only in step 6.

Runtime cache checks: 40 engine tests pass, including direct equality against uncached reservations and calendar boundaries. Thirty diagnostic careful results match byte for byte (/tmp/plan5-leisure-before.json, /tmp/plan5-leisure-indexed.json); time 8.37 to 5.19 seconds. Main-1 workers predate the caches, so their timing target is not a current runtime measurement. No game values have been tuned yet.

## For Henry to review (non-blocking)

- Step 2: careful expansion also responds to packed slots and refusals in three of eight weeks; no hidden demand is used. A deposit-refund defect was found during staffing diagnosis and is next. See docs/decisions.md, Plan 5 step 2.

- Step 2: next-room choices use observed freshness; first theme is broad or seeded, never picked from hidden truth. Simultaneous rebuilds share one budget. See docs/decisions.md, Plan 5 step 2.

- Step 2: four spaces reserved from design start, minimum two rooms for companies, and prices/open sales by slot. Staff figures include employer costs; other estimates are labelled in spec section 15. See docs/decisions.md, Plan 5 step 2.

- Step 2: same-basement stage 2, company room-game units and separate design/construction time. Targets T1–T18, E1 and X1–X4 apply. See docs/decisions.md, Plan 5 step 2.

- Step 1: lead freelance instructors stand for role-level followings; agreed contract prices stay fixed, and intro conversion preserves signup cohorts. See docs/decisions.md, Plan 5 step 1.

- Step 1: four-week billing, 52-week annual terms, paid-at-start builds, bank reimbursement and cumulative setting work. See docs/decisions.md, Plan 5 step 1.

- Step 0: all nine content/save fingerprints are now captured, alongside the required main-part baselines (1,000 seeds, test). See docs/decisions.md, Plan 5 step 0.

- Step 0: formatting only in three pre-existing files; no game values changed. See docs/decisions.md, Plan 5 step 0. Browser tests require local server permission; initial checks passed (1,396 tests, 18 skipped; lint and typechecks).

## Stopped

