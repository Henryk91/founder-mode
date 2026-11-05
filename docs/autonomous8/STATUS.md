# Autonomous run 8 status

## Current
Step: step 3 continued after plan8-complete (Henry asked to finish it in three batches)
Last commit: Plan 8 step 3 batch 2
Next action: UI checks (axe, no cut-off, 375/390/430/1440 px, Chromium and WebKit, three stages), main part of every scenario on 1,000 seeds, tag plan8-screens-complete. Batch 3 (20, 22, 25) not done.

## Checklist
- [x] Step 0: set up (tag plan8-baseline)
- [x] Step 1: money bugs, one ledger and the invariant test (tag plan8-ledger)
- [x] Step 2: money rules and the loan form (tag plan8-rules)
- [x] Step 3 (partly, see final report): screens and wording (tag plan8-screens)
- [x] Step 4: wrap up (tag plan8-complete)

## Findings
Batch 1 done: K17, K6, H-05, 9, 11 and R-04, 12, K7, K10, K21 and K24, S-02 (steps only; direct entry and apply-to-all go to the backlog). Browser tests fixed: week heading, tourism 'From guests', Griffig fault label, partner boat button.
H-01 reproduced yes, fixed yes (loan buys only unpaid items). G-02/F-02 reproduced yes (cash below zero with one miss ends as bank called; text said two), fixed yes (post-mortem names trigger). S-03 fixed (13 periods). Ledger totals, forecast, invariant test: done, passing in every scenario/mode.
P-01 (added by Henry mid-run): reproduced yes, fixed yes (engine rule, bots drop unaffordable expenses, disabled controls on build, rooms, landing tests).

## For Henry to review (non-blocking)
See docs/autonomous8/reports/final.md. Step 3 is partial; the UI checks were not run.

## Stopped
