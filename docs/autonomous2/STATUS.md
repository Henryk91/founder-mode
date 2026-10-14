# Autonomous run 2 status

## Current
Step: 1 gate running on main (60 week identical; Kantino long and tourism reports running); step 2 built on branch plan2-work (worktree ../founder-mode-plan2), being measured.
Last commit: Step 1: screen test for the new parts, schema and decisions (main); Step 2 WIP (plan2-work)
Next action: when the gate finishes, write reports/step1-features.md (targets before and after), tag plan2-features; then finish step 2 (measure L1 to L4, UI test, seeds, fingerprints), merge, tag plan2-loan.

## Checklist
- [x] Step 0: take stock (tag plan2-baseline)
- [ ] Step 1: spec features (tag plan2-features)
- [ ] Step 2: bank loan (tag plan2-loan)
- [ ] Step 3: tourism inbox (tag plan2-inbox)
- [ ] Step 4: retune tourism (tag plan2-tourism)
- [ ] Step 5: Kantino long, funding and target 20 (tag plan2-kantino-long)
- [ ] Step 6: wrap up (tag plan2-complete)

## Carried over from the tourism fixes
- Naive careful (1000 seeds): Gratwanderung 32.8% (careful 44.2), Hinterhof 20.9% (24.4), Seeblick 15.3% (31.4). Gaps: the reader (all three), Seeblick's loan bridge.
- Event tables: cheapest answer wins in 49%, 55%, 68% of judged events (rule: a third, all pass). Dominant effort: `tourism_fair` (Gratwanderung, +5.9, reader misses it). Always wrong: every monthly-cost hire offer (office help, apprentice, dishwasher, caretaker, minijob student, laundry, guides' wages) and the refit and refresh offers (traps the reader declines). Nothing broken. Report: docs/autonomous/reports/tourism-fixes.md.
- Spec gaps of item 8 (experiments, vouchers as a liability, lunch test): step 1a.
- Item 11: an invoiced platform booking is invoiced net; a firm that never pays costs only the net.

## Open issues
- T6 inbox, all three tourism scenarios (step 3).
- L2, L3 bank loan, Hinterhof and Seeblick (step 2).
- Seeblick T3 spread 22.4, T7 pricing -1.1, T11 policy strict +4.3 (step 4).
- Kantino long 31, 32, 33, 36, 20; 27 at the limit (step 5).

## For Henry to review (non-blocking)
- Step 0: the 60 week event table heading now names the reading run `validate_then_build inbox:reader` (text only, from the fixes session) (step0-baseline report).

## Stopped
