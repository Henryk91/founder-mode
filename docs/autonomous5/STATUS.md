# Autonomous run 5 status

## Current

Step: 2.5 Final values measured; event table and full phase checks running.
Last commit: HEAD, Plan 5: record complete phase tests and isolated venue preparation.
Next action: Finish the once-only event table (session 14569, /tmp/plan5-ausgesperrt-events.log) ; full tests pass (79 files/1,542 tests, 21 skipped). Update reports/step2-escape.md, commit/tag plan5-escape when green, then begin step 3 from a clean tree. Formula allowance deliberately unused; eight targets remain open for step 6. Never rerun the event table or full report to reconfirm.

## Checklist

- [x] Step 0: set up and baseline (tag plan5-baseline)
- [x] Step 1: shared engine additions (tag plan5-engine)
- [ ] Step 2: Ausgesperrt (tag plan5-escape)
- [ ] Step 3: Fabriketage (tag plan5-venue)
- [ ] Step 4: Schweißperle (tag plan5-fitness)
- [ ] Step 5: Griffig (tag plan5-climbing)
- [ ] Step 6: wrap up (tag plan5-complete)

## Running checks and open issues

- Final main measurement complete: all 28 strategies, 1,000 `test` seeds. Careful 42.8% ±3.1; top 48.4%; slowest 128 seconds. Every escape target passes; X1 at the limit. Main result: tuning/ausgesperrt-values-2.md; raw later-step baseline: baseline/ausgesperrt-long.md, fingerprint alongside it.
- Open: T2 no-tests 22.1%, T3 market spread 32.5 ±7.0, T6 blind effort too helpful, T10 review-blind +4.7, T11 policy split inconclusive, T14 seasonal +1.9 ±2.2, T15 borrowing +16.5, T17 owing gap 3.9. Full values, closest results and options: reports/step2-escape.md. Two value rounds used; formula allowance unused by decision, not claimed exhausted. Revisit all eight once in step 6.
- Event table running once, parts events, 1,000 `test` seeds, two workers: session 14569, /tmp/plan5-ausgesperrt-events.log. Full report has not run; reserved for step 6.
- Full tests pass: 79 files, 1,542 passed, 21 skipped; /tmp/plan5-step2-final-full-tests.log, two workers. Final-value lint/typechecks pass; 235 focused tests pass, 21 skipped. Screenshots and all browser checks refreshed.
- Seed regeneration complete: 171 examples; 172 checks pass. Eight Ausgesperrt rows changed; protected rows byte identical.
- All nine protected main comparisons and fingerprints match baseline exactly apart from timings, 1,000 `test` seeds per strategy; reports/step2-protected.md and protected-step2/. Neither value round changed engine/shared bots.
- UI checks: three stages, 375/390/430/1440 px, Chromium/WebKit/axe/cut/words. Help/results/post-mortem words 390/1440. Screenshot refresh in the full suite: /var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-leisure.
- Corrected company demand prose: base 4–14 counts room-games, roughly 1.3–4.7 requests at mean three games. Measured values remain intact; this was a documentation error.

Isolated venue implementation draft: /private/tmp/founder-mode-plan5-venue, branch plan5-venue-work, first planning commit (resolve via git log). Source/dependencies are isolated; merge only after the event table finishes and main tags plan5-escape. Its venue/IMPLEMENTATION.md records targets/gaps/adaptations. Code review found existing forward sales already work for prepared readyWeek builds; reuse and test them.

Later-step preparation only, outside repo; integrate in order after the current phase gate:
- Venue: /tmp/plan5-venue-prep.md (gaps incl forward sales, assets and ancillary receipts), /tmp/plan5-venue-content-draft/ (PENDING.md), /tmp/plan5-venue-events-draft.md (48 events), /tmp/plan5-venue-quotes-draft.json (150 quotes), /tmp/plan5-venue-scenes-draft.json (two SVG scenes). Primary permission sources: /tmp/plan5-research-notes.md, 21 October entry.
- Fitness: /tmp/plan5-membership-prep.md, /tmp/plan5-fitness-content-draft/, /tmp/plan5-fitness-events-draft.md (48 events), /tmp/plan5-fitness-quotes-draft.json (150 quotes), /tmp/plan5-fitness-scenes-draft.json (two SVG scenes).
- Climbing: /tmp/plan5-climbing-content-draft/, /tmp/plan5-climbing-events-draft.md (48 events), /tmp/plan5-climbing-quotes-draft.json (150 quotes), /tmp/plan5-climbing-scenes-draft.json (two SVG scenes).
These drafts do not implement their pending mechanics. Current repo content/UI remain authoritative.

## For Henry to review (non-blocking)

- Step 2: playable final values, eight open tourism targets, formula allowance deliberately unused; demand-unit prose corrected. See reports/step2-escape.md and docs/decisions.md.

- Step 2: second and last value round adjusts upkeep, temporary staffing, demand, fault reviews, budget signals and cancellation trade-offs; estimates are in spec section 15 and docs/decisions.md.

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

