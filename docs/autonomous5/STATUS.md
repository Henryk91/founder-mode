# Autonomous run 5 status

## Current

Step: 3.2 Isolated venue engine draft: permit decisions/refunds complete.
Last commit: HEAD, Plan 5: implement waited permit decisions and one-time refunds.
Next action: Add venue deposit-only strict cancellation with fixture tests/schema docs, then integrate venue content/bots/UI. Worktree /private/tmp/founder-mode-plan5-venue, branch plan5-venue-work. Main step2 tests pass; event table/session14569 still running. Merge only after main tags plan5-escape. No venue measurement yet; prove nine protected games plus Ausgesperrt unchanged after shared work.

## Checklist

- [x] Step 0: set up and baseline (tag plan5-baseline)
- [x] Step 1: shared engine additions (tag plan5-engine)
- [ ] Step 2: Ausgesperrt (tag plan5-escape)
- [ ] Step 3: Fabriketage (tag plan5-venue)
- [ ] Step 4: Schweißperle (tag plan5-fitness)
- [ ] Step 5: Griffig (tag plan5-climbing)
- [ ] Step 6: wrap up (tag plan5-complete)

## Running checks and open issues

- Current worktree:78 engine tests pass (7 permits+10 noise/receipts+17 venue+44 leisure), including public refund terms, approval/refusal, no retry, one refund and replay. /tmp/plan5-venue-permit-tests.log; lint/typechecks pass at /tmp/plan5-venue-permit-lint.log. Report refusal text uses labels and existing Results styling; new scenario UI/browser checks remain pending.

- Current worktree:71 engine tests pass (10 noise/receipts+17 venue+44 leisure), including immediate/single refunds, real contribution, date restrictions, fee attribution, public conditions and replay. /tmp/plan5-venue-noise-tests-4.log; lint/typechecks green at /tmp/plan5-venue-noise-lint-ready.log. Replay fixture needed matched budgets and its distinct late route; all assertions now pass. No unresolved test failure.

- Equipment draft:61 focused engine tests pass (17 venue+44 leisure), including purity, refunds, hire/own costs, aliases, lease-date calendar and replay. /tmp/plan5-venue-assets-tests-2.log; lint/typechecks pass at /tmp/plan5-venue-assets-lint-2.log. First withdrawal test failed once; first service-capacity repair passed. No unresolved test failure.

- Worktree draft:52 engine tests pass (8 venue+44 leisure), lint/typechecks green; /tmp/plan5-venue-capacity-tests.log and /tmp/plan5-venue-capacity-lint.log. Types and schema docs updated together. New closures/upgrades are off unless YAML enables them. Full phase/protected checks remain pending after all shared changes.

- Final main measurement complete: all 28 strategies, 1,000 `test` seeds. Careful 42.8% ±3.1; top 48.4%; slowest 128 seconds. Every escape target passes; X1 at the limit. Main result: tuning/ausgesperrt-values-2.md; raw later-step baseline: baseline/ausgesperrt-long.md, fingerprint alongside it.
- Open: T2 no-tests 22.1%, T3 market spread 32.5 ±7.0, T6 blind effort too helpful, T10 review-blind +4.7, T11 policy split inconclusive, T14 seasonal +1.9 ±2.2, T15 borrowing +16.5, T17 owing gap 3.9. Full values, closest results and options: reports/step2-escape.md. Two value rounds used; formula allowance unused by decision, not claimed exhausted. Revisit all eight once in step 6.
- Event table running once, parts events, 1,000 `test` seeds, two workers: session 14569, /tmp/plan5-ausgesperrt-events.log. Full report has not run; reserved for step 6.
- Full tests running with two workers: session 8519, /tmp/plan5-step2-final-full-tests.log. Final-value lint/typechecks pass; 235 focused tests pass, 21 skipped. Existing leisure engine 44 and bot 36 tests pass. Before final bot/value changes, full suite 79 files/1,539 passed/21 skipped.
- Seed regeneration complete: 171 examples; 172 checks pass. Eight Ausgesperrt rows changed; protected rows byte identical.
- All nine protected main comparisons and fingerprints match baseline exactly apart from timings, 1,000 `test` seeds per strategy; reports/step2-protected.md and protected-step2/. Neither value round changed engine/shared bots.
- UI checks: three stages, 375/390/430/1440 px, Chromium/WebKit/axe/cut/words. Help/results/post-mortem words 390/1440. Screenshot refresh in the full suite: /var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-leisure.
- Corrected company demand prose: base 4–14 counts room-games, roughly 1.3–4.7 requests at mean three games. Measured values remain intact; this was a documentation error.

Later-step preparation only, outside repo; integrate in order after the current phase gate:
- Venue: /tmp/plan5-venue-prep.md (gaps incl forward sales, assets and ancillary receipts), /tmp/plan5-venue-content-draft/ (PENDING.md), /tmp/plan5-venue-events-draft.md (48 events), /tmp/plan5-venue-quotes-draft.json (150 quotes), /tmp/plan5-venue-scenes-draft.json (two SVG scenes). Primary permission sources: /tmp/plan5-research-notes.md, 21 October entry.
- Fitness: /tmp/plan5-membership-prep.md, /tmp/plan5-fitness-content-draft/, /tmp/plan5-fitness-events-draft.md (48 events), /tmp/plan5-fitness-quotes-draft.json (150 quotes), /tmp/plan5-fitness-scenes-draft.json (two SVG scenes).
- Climbing: /tmp/plan5-climbing-content-draft/, /tmp/plan5-climbing-events-draft.md (48 events), /tmp/plan5-climbing-quotes-draft.json (150 quotes), /tmp/plan5-climbing-scenes-draft.json (two SVG scenes).
These drafts do not implement their pending mechanics. Current repo content/UI remain authoritative.

## For Henry to review (non-blocking)

- Step 3 draft: targets/gaps and lower-floor/catering/late-condition adaptations are recorded before coding; see venue/IMPLEMENTATION.md and docs/decisions.md.

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

