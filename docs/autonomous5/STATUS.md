# Autonomous run 5 status

## Current

Step: 2.3.5 Correctness repairs and complete validation are green; balance measurement running.
Last commit: HEAD, Plan 5: measure optional room loans and explain refunds.
Next action: Finish complete main measurement (session 73208, /tmp/plan5-ausgesperrt-main-2.log, tuning/ausgesperrt-main-2.md) and the new paired loan comparison (session 53242, /tmp/plan5-ausgesperrt-later-loan.log). Both use 1,000 test seeds, main only. Use the loan report for T15 and leisure split margins; main-2 workers predate those reporting fixes but use all gameplay fixes. Judge every target before tuning. Then run the event table once and protected main proofs. Full report only in step 6.

## Checklist

- [x] Step 0: set up and baseline (tag plan5-baseline)
- [x] Step 1: shared engine additions (tag plan5-engine)
- [ ] Step 2: Ausgesperrt (tag plan5-escape)
- [ ] Step 3: Fabriketage (tag plan5-venue)
- [ ] Step 4: Schweißperle (tag plan5-fitness)
- [ ] Step 5: Griffig (tag plan5-climbing)
- [ ] Step 6: wrap up (tag plan5-complete)

## Open issues

No complete final target measurement yet. Refund-only contribution: careful 5.1%, understaffing 3.4%, quarterly rooms 21.7%, before the accepted-loan ceiling fix; see tuning/ausgesperrt-repaired-core.md. Interrupted diagnostic runs are documented in tuning/ausgesperrt-accounting-diagnosis.md and tuning/ausgesperrt-initial-interrupted.md. No scenario-value/formula tuning rounds consumed.

Full validation: 79 files, 1,539 tests passed, 21 skipped; lint/typechecks pass. This includes 44 leisure engine tests, 33 leisure bot tests, all seed examples, Help/results/post-mortem word checks and 24 browser cases across three stages/four widths/Chromium/WebKit with axe. Screenshots: /var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-leisure. Seed regeneration changes only Ausgesperrt. Later-step event copy is drafted outside the repo at /tmp/plan5-venue-events-draft.md; integrate only after step 2 passes.

Runtime cache checks: 40 engine tests pass, including direct equality against uncached reservations and calendar boundaries. Thirty diagnostic careful results match byte for byte (/tmp/plan5-leisure-before.json, /tmp/plan5-leisure-indexed.json); time 8.37 to 5.19 seconds. Main-1 workers predate the caches, so their timing target is not a current runtime measurement. No game values have been tuned yet.

## For Henry to review (non-blocking)

- Step 2: T15 compares later-room borrowing with retained-cash finance; T3 applies its 95% split margin. Thresholds stay unchanged. See docs/decisions.md, Plan 5 step 2.

- Step 2: accepting a loan clears the bot’s refusal ceiling so later rooms can obtain larger loans; extended leisure word checks cover Help/results/post-mortem. See docs/decisions.md, Plan 5 step 2.

- Step 2: advance deposits are refunded on company or flexible guest cancellation, gated to leisure. Strict guest cancellations retain the agreed price. This fixes an accounting defect, before value tuning. See docs/decisions.md, Plan 5 step 2.

- Step 2: careful expansion also responds to packed slots and refusals in three of eight weeks; no hidden demand is used. A deposit-refund defect was found during staffing diagnosis and is next. See docs/decisions.md, Plan 5 step 2.

- Step 2: next-room choices use observed freshness; first theme is broad or seeded, never picked from hidden truth. Simultaneous rebuilds share one budget. See docs/decisions.md, Plan 5 step 2.

- Step 2: four spaces reserved from design start, minimum two rooms for companies, and prices/open sales by slot. Staff figures include employer costs; other estimates are labelled in spec section 15. See docs/decisions.md, Plan 5 step 2.

- Step 2: same-basement stage 2, company room-game units and separate design/construction time. Targets T1–T18, E1 and X1–X4 apply. See docs/decisions.md, Plan 5 step 2.

- Step 1: lead freelance instructors stand for role-level followings; agreed contract prices stay fixed, and intro conversion preserves signup cohorts. See docs/decisions.md, Plan 5 step 1.

- Step 1: four-week billing, 52-week annual terms, paid-at-start builds, bank reimbursement and cumulative setting work. See docs/decisions.md, Plan 5 step 1.

- Step 0: all nine content/save fingerprints are now captured, alongside the required main-part baselines (1,000 seeds, test). See docs/decisions.md, Plan 5 step 0.

- Step 0: formatting only in three pre-existing files; no game values changed. See docs/decisions.md, Plan 5 step 0. Browser tests require local server permission; initial checks passed (1,396 tests, 18 skipped; lint and typechecks).

## Stopped

