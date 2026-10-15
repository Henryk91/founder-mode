# Autonomous run 2 status

## Current
Step: 5, Kantino long mode, funding and target 20.
Last commit: Step 4 tourism checkpoint (this commit; tag `plan2-tourism`); Step 4 gates passed.
Next action: read the current Kantino long reports and tune targets 31, 32, 33, 36 and 20 without changing the protected 60 week scenarios. Continue on main; the stale plan2-work worktree remains behind main.

## Checklist
- [x] Step 0: take stock (tag plan2-baseline)
- [x] Step 1: spec features (tag plan2-features)
- [x] Step 2: bank loan (tag plan2-loan)
- [x] Step 3: tourism inbox (tag plan2-inbox)
- [x] Step 4: retune tourism (tag plan2-tourism)
- [ ] Step 5: Kantino long, funding and target 20 (tag plan2-kantino-long)
- [ ] Step 6: wrap up (tag plan2-complete)

## Carried over from the tourism fixes
- Naive careful (1000 seeds): Gratwanderung 32.8% (careful 44.2), Hinterhof 20.9% (24.4), Seeblick 15.3% (31.4). Gaps: the reader (all three), Seeblick's loan bridge.
- Event tables: cheapest answer wins in 49%, 55%, 68% of judged events (rule: a third, all pass). Dominant effort: `tourism_fair` (Gratwanderung, +5.9, reader misses it). Always wrong: every monthly-cost hire offer (office help, apprentice, dishwasher, caretaker, minijob student, laundry, guides' wages) and the refit and refresh offers (traps the reader declines). Nothing broken. Report: docs/autonomous/reports/tourism-fixes.md.
- Spec gaps of item 8 (experiments, vouchers as a liability, lunch test): step 1a.
- Item 11: an invoiced platform booking is invoiced net; a firm that never pays costs only the net.

## Open issues
- T14 all tourism scenarios: no contract kind clears its paired margin consistently. Three formula rounds were tried and reverted; fresh step 6 budget.
- Hinterhof T2: no-tests wins 20.6% (limit 5%); T3 spread is 15.9 points (limit 15). Value budget used; fresh step 6 budget.
- Seeblick T6: reading +9.5, blind effort +6.8. Value and inbox budgets used; fresh step 6 budget.
- Gratwanderung school demand remains 9 to 12 groups at peak against the spec's 0.3 to 1.2; every closer tested range was unplayable or less fair.
- Kantino long 31, 32, 33, 36, 20; 27 at the limit (step 5).

## For Henry to review (non-blocking)
- Step 4: T14 judges each contract kind against weekly shifts in its best viable-segment split, by more than the paired margin (decisions, plan 2 step 4).
- Step 0: the 60 week event table heading now names the reading run `validate_then_build inbox:reader` (text only, from the fixes session) (step0-baseline report).

## Stopped
