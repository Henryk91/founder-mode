# Autonomous run 5 status

## Current

Step: 2.4 First scenario-value tuning round applied.
Last commit: HEAD, Plan 5: record first value-round progress and later content drafts.
Next action: Read the first value-round measurement (session 38254) at /tmp/plan5-ausgesperrt-values-1.log and tuning/ausgesperrt-values-1.md when complete; assess every target before the second value round. Main only, 1,000 test seeds; full report remains reserved for step 6.

## Checklist

- [x] Step 0: set up and baseline (tag plan5-baseline)
- [x] Step 1: shared engine additions (tag plan5-engine)
- [ ] Step 2: Ausgesperrt (tag plan5-escape)
- [ ] Step 3: Fabriketage (tag plan5-venue)
- [ ] Step 4: Schweißperle (tag plan5-fitness)
- [ ] Step 5: Griffig (tag plan5-climbing)
- [ ] Step 6: wrap up (tag plan5-complete)

## Running checks

- Value-round partial counts (not the completed target judgement): careful 55.7%, quarterly 59.1%, themes 56.1%, no daytime 39.5%, VR 43.7%, cash-only 43.0%, no tests 43.1%, fixed prices 58.5%, review-blind 62.0%. Each completed strategy has 1,000 `test` seeds. Wait for all paired target results before round 2.

- Value round 1: lint/typechecks pass; focused content and leisure-bot checks pass (235 tests, 21 skipped). Measurement is running, main only, 1,000 `test` seeds, 28 strategies; /tmp/plan5-ausgesperrt-values-1.log.

- Main-3 completed: all 28 strategies, main only, 1,000 `test` seeds. Intermediate complete target table in tuning/ausgesperrt-main-3.md, before the horizon/portfolio/contract-coverage corrections. Do not tune from its old bot verdicts.
- Protected proof complete: all nine main-only, 1,000-`test` comparisons and fingerprints match exactly apart from timings. See reports/step2-protected.md and protected-step2/. Session 17724 completed successfully.
- Full tests are green: 79 files, 1,539 passed, 21 skipped; /tmp/plan5-step2-finished-rooms-full-test-2.log, two workers. Browser teardown passed after the first repair (new leisure port 5202 plus lower test concurrency). Lint/typechecks pass; /tmp/plan5-step2-test-port-lint.log.
- Seed regeneration finished; docs/seeds.md changes only Ausgesperrt. All nine protected snapshots and validation are committed.

- Corrected no-tests strategy finished: 29.5% on main only, 1,000 `test` seeds, one process; tuning/ausgesperrt-no-tests-corrected.md. This predates the horizon guard and is diagnostic.
- Horizon guard: 35 leisure bot tests and lint/typechecks pass. The 30-seed behaviour trace has zero unusable rebuilds after the guard (/tmp/plan5-rebuild-horizon-fixed.json), versus four before. Refresh seed examples and full tests after the next outcome changes; neither is a new balance measurement.

- Final bot baseline completed successfully: session 67784, /tmp/plan5-final-bot-baseline-progress.log; writes tuning/ausgesperrt-main-4.md and /tmp/plan5-ausgesperrt-main-4.log. No values changed. Current bot correction prevents seasonal hires from covering work already covered by permanent/part-time staff; all 36 bot tests and lint/typechecks pass.

## Open issues

Main-4 is complete: careful 75.8%, top 79.6%, no-tests 68.6%; the initial economy is too generous. One of two value rounds assigned to every applicable target; no formula rounds consumed. The diagnostic reports document interrupted measurements and corrected bot/accounting defects; do not use their target verdicts as final balance. Full report has not run.

Latest focused checks: 44 leisure engine and 36 bot tests pass. The full suite also passes after the unfinished-room bot repair: 79 files / 1,539 tests (21 skipped), with lint/typechecks green. Browser coverage includes Help/results/post-mortem words and 24 cases over three stages, four widths, Chromium/WebKit and axe. Screenshots: /var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-leisure.

Runtime caches previously proved byte-identical on 30 careful diagnostic runs. Main-3 timings overlap full tests and protected runs; note contention when judging T12. Diagnostic traces are behaviour checks, not target measurements.

Later-step preparation only, outside repo; integrate only in the corresponding step:
- Venue: /tmp/plan5-venue-prep.md, /tmp/plan5-venue-events-draft.md (48 events), /tmp/plan5-venue-quotes-draft.json (150 quotes), /tmp/plan5-venue-scenes-draft.json (two SVG scenes), /tmp/plan5-venue-content-draft/ (catalogue/intro/features).
- Fitness: /tmp/plan5-membership-prep.md (engine gaps), /tmp/plan5-fitness-events-draft.md (48 events), /tmp/plan5-fitness-quotes-draft.json (150 quotes), /tmp/plan5-fitness-scenes-draft.json (two SVG scenes), /tmp/plan5-fitness-content-draft/ (catalogue/intro/features).
- Climbing: /tmp/plan5-climbing-events-draft.md (48 events), /tmp/plan5-climbing-quotes-draft.json (150 quotes), /tmp/plan5-climbing-scenes-draft.json (two SVG scenes).
These are copy/design drafts, not implemented mechanics or completed phase gates. Current repo content/UI remain authoritative; do not recopy old Ausgesperrt drafts.

## For Henry to review (non-blocking)

- Step 2: first value round uses estimated room upkeep, flexible staffing premium and market-specific demand; see spec section 15 and docs/decisions.md.

- Step 2: all nine protected main comparisons and content/save fingerprints match baseline; see reports/step2-protected.md.

- Step 2: leisure seasonal hiring subtracts every working contract’s coverage, preventing duplicate cover on top of permanent staff. See docs/decisions.md, Plan 5 step 2.

- Step 2: bots decline builds beyond the run and rebuilds that cannot repay even at maximum quoted remaining receipts. See docs/decisions.md, Plan 5 step 2.

- Step 2: no-tests buys expensive quoted builds first so the four-space limit does not silently remove the VR temptation. See docs/decisions.md, Plan 5 step 2.

- Step 2: unfinished rooms remain in the build queue, and the no-later-loan variant cannot bypass its policy through office finance. See docs/decisions.md, Plan 5 step 2.

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

