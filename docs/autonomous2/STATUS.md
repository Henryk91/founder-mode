# Autonomous run 2 status

## Current
Step: complete, audited (tag `plan2-audited`).
Last commit: final Plan 2 checkpoint (this commit; tag `plan2-complete`).
Next action: Plan 3 may begin from its section 0.

## Checklist
- [x] Step 0: take stock (tag plan2-baseline)
- [x] Step 1: spec features (tag plan2-features)
- [x] Step 2: bank loan (tag plan2-loan)
- [x] Step 3: tourism inbox (tag plan2-inbox)
- [x] Step 4: retune tourism (tag plan2-tourism)
- [x] Step 5: Kantino long, funding and target 20 (tag plan2-kantino-long)
- [x] Step 6: wrap up (tag plan2-complete)

## Carried over from the tourism fixes
- Naive careful (1000 seeds): Gratwanderung 32.8% (careful 44.2), Hinterhof 20.9% (24.4), Seeblick 15.3% (31.4). Gaps: the reader (all three), Seeblick's loan bridge.
- Event tables: cheapest answer wins in 49%, 55%, 68% of judged events (rule: a third, all pass). Dominant effort: `tourism_fair` (Gratwanderung, +5.9, reader misses it). Always wrong: every monthly-cost hire offer (office help, apprentice, dishwasher, caretaker, minijob student, laundry, guides' wages) and the refit and refresh offers (traps the reader declines). Nothing broken. Report: docs/autonomous/reports/tourism-fixes.md.
- Spec gaps of item 8 (experiments, vouchers as a liability, lunch test): step 1a.
- Item 11: an invoiced platform booking is invoiced net; a firm that never pays costs only the net.

## Open issues
After the audit (`docs/autonomous3/reports/audit.md`; details and options in `reports/final.md`):
- Tourism T14, all three: contract bots sign only once a run is won, so win rates cannot show a contract paying.
- Hinterhof T2: no-tests 16.6% (limit 5%). Hinterhof T7: +0.0 ±1.8, fails within noise.
- Seeblick T6: reading +7.7, blind effort +5.7. Seeblick T7 and T11: fail within noise after the T1 fix.
- Gratwanderung school demand 5 to 8 groups at peak, above the spec's 0.3 to 1.2.
- Kantino long T20, T27 (at the limit), T32, T33: carried to plan 3 step 2.

## For Henry to review (non-blocking)
- Plan 2 audit: see the priority list in `reports/final.md` (T14's measure, T32 and T33 restatement options, estimates chosen while tuning).
- Step 4: T14 judges each contract kind against weekly shifts in its best viable-segment split, by more than the paired margin (decisions, plan 2 step 4).
- Step 0: the 60 week event table heading now names the reading run `validate_then_build inbox:reader` (text only, from the fixes session) (step0-baseline report).

## Stopped
