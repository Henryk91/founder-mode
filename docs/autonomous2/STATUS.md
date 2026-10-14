# Autonomous run 2 status

## Current
Step: 4, retune the three tourism scenarios (not started).
Last commit: Step 3 done (tag plan2-inbox)
Next action: step 4 from AUTONOMOUS_PLAN_2.md section 5: add targets T13 (naive careful at least 20% and within 10 of careful) and T14 (every contract kind wins somewhere; bots tourism_permanent, tourism_seasonal, tourism_part_time via TourismRule.contracts) to packages/bots/src/tourismReport.ts; then tune Hinterhof (T1 17.3%, T2 no-tests 6.8%, T3 22.9, L3), Seeblick (T3 23.8, T6, T11), Gratwanderung (T3 17.2, T11, school demand nearer the spec). Work on branch plan2-work in ../founder-mode-plan2; quick checks with packages/bots/scratch/dbg2.ts.

## Checklist
- [x] Step 0: take stock (tag plan2-baseline)
- [x] Step 1: spec features (tag plan2-features)
- [x] Step 2: bank loan (tag plan2-loan)
- [x] Step 3: tourism inbox (tag plan2-inbox)
- [ ] Step 4: retune tourism (tag plan2-tourism)
- [ ] Step 5: Kantino long, funding and target 20 (tag plan2-kantino-long)
- [ ] Step 6: wrap up (tag plan2-complete)

## Carried over from the tourism fixes
- Naive careful (1000 seeds): Gratwanderung 32.8% (careful 44.2), Hinterhof 20.9% (24.4), Seeblick 15.3% (31.4). Gaps: the reader (all three), Seeblick's loan bridge.
- Event tables: cheapest answer wins in 49%, 55%, 68% of judged events (rule: a third, all pass). Dominant effort: `tourism_fair` (Gratwanderung, +5.9, reader misses it). Always wrong: every monthly-cost hire offer (office help, apprentice, dishwasher, caretaker, minijob student, laundry, guides' wages) and the refit and refresh offers (traps the reader declines). Nothing broken. Report: docs/autonomous/reports/tourism-fixes.md.
- Spec gaps of item 8 (experiments, vouchers as a liability, lunch test): step 1a.
- Item 11: an invoiced platform booking is invoiced net; a firm that never pays costs only the net.

## Open issues
- L3 Hinterhof (step 2): reckless ends owing the bank +11.3 ±3.4 points more often than careful (needs 15); careful already fails owing in 76% of runs (T1 19.5%). Revisit with step 4's retune.
- Hinterhof T2: the no-tests bot wins 11.9% since step 2 (limit 5%); step 4.
- Hinterhof T1 19.5% and T3 spread 26.7 (evening locals 7.5%) since the kitchen and floor split (step 1); step 4.
- T6 Seeblick (step 3, budget used): reading +9.4, blind effort +6.5 on 2,000 seeds. Options: a Seeblick pass over effortful answers with unconditional positive effects; fewer mild unconditional benefits.
- L2, L3 bank loan, Hinterhof and Seeblick (step 2).
- Seeblick T3 spread 22.4, T7 pricing -1.1, T11 policy strict +4.3 (step 4).
- Kantino long 31, 32, 33, 36, 20; 27 at the limit (step 5).

## For Henry to review (non-blocking)
- Step 0: the 60 week event table heading now names the reading run `validate_then_build inbox:reader` (text only, from the fixes session) (step0-baseline report).

## Stopped
