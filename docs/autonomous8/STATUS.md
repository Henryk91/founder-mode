# Autonomous run 8 status

## Current
Step: complete
Last commit: Plan 8 step 0: set up
Next action: none. Henry reviews docs/autonomous8/reports/final.md.

## Checklist
- [x] Step 0: set up (tag plan8-baseline)
- [x] Step 1: money bugs, one ledger and the invariant test (tag plan8-ledger)
- [x] Step 2: money rules and the loan form (tag plan8-rules)
- [x] Step 3 (partly, see final report): screens and wording (tag plan8-screens)
- [x] Step 4: wrap up (tag plan8-complete)

## Findings
H-01 reproduced yes, fixed yes (loan buys only unpaid items). G-02/F-02 reproduced yes (cash below zero with one miss ends as bank called; text said two), fixed yes (post-mortem names trigger). S-03 fixed (13 periods). Ledger totals, forecast, invariant test: done, passing in every scenario/mode.
P-01 (added by Henry mid-run): reproduced yes, fixed yes (engine rule, bots drop unaffordable expenses, disabled controls on build, rooms, landing tests).

## For Henry to review (non-blocking)
See docs/autonomous8/reports/final.md. Step 3 is partial; the UI checks were not run.

## Stopped
