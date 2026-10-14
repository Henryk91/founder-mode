# Autonomous run 2 status

## Current
Step: 2 gate finishing (60 week and Kantino long identical; Hinterhof and Seeblick reports with events writing to docs/balancing.md). Step 3 in progress on branch plan2-work (worktree ../founder-mode-plan2, commit "Step 3 WIP").
Last commit: Step 2: fingerprints, seeds, lint (main); Step 3 WIP (plan2-work)
Next action: write reports/step2-loan.md from docs/balancing.md (L2 pass in both; L3 Seeblick pass, Hinterhof gap +11.3 against 15: open, step 4), commit, tag plan2-loan. Then step 3: measured on 2,000 seeds (scratch dbg2 in packages/bots/scratch): Gratwanderung reading +15.6 / effort +5.2 (at the limit), Seeblick +9.4 / +6.5 (fail), Hinterhof +2.5 / -0.2 (reading under 3). Next lever for Seeblick: its effort gain is not from guests; ablate effect classes there (scratch dbg2 variants noReview, noCashIn, ...) and make the top class situational; then the event table, docs, decisions, tag plan2-inbox.

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
- L3 Hinterhof (step 2): reckless ends owing the bank +11.3 ±3.4 points more often than careful (needs 15); careful already fails owing in 76% of runs (T1 19.5%). Revisit with step 4's retune.
- Hinterhof T1 19.5% and T3 spread 26.7 (evening locals 7.5%) since the kitchen and floor split (step 1); step 4.
- T6 inbox, all three tourism scenarios (step 3).
- L2, L3 bank loan, Hinterhof and Seeblick (step 2).
- Seeblick T3 spread 22.4, T7 pricing -1.1, T11 policy strict +4.3 (step 4).
- Kantino long 31, 32, 33, 36, 20; 27 at the limit (step 5).

## For Henry to review (non-blocking)
- Step 0: the 60 week event table heading now names the reading run `validate_then_build inbox:reader` (text only, from the fixes session) (step0-baseline report).

## Stopped
