# Autonomous run 8 status

## Current
Step: 2 (money rules and the loan form) not started
Last commit: Plan 8 step 0: set up
Next action: step 2: findings 4, 8, 17, 10, H-03, G-06, G-03, G-04, then the loan form (6, 7, 23, F-05, S-04). Then measure once (main part, 1,000 seeds, all scenarios, tourism with --mode all) and `pnpm seeds`.

## Checklist
- [x] Step 0: set up (tag plan8-baseline)
- [x] Step 1: money bugs, one ledger and the invariant test (tag plan8-ledger)
- [ ] Step 2: money rules and the loan form (tag plan8-rules)
- [ ] Step 3: screens and wording (tag plan8-screens)
- [ ] Step 4: wrap up (tag plan8-complete)

## Findings
H-01 reproduced yes, fixed yes (loan buys only unpaid items). G-02/F-02 reproduced yes (cash below zero with one miss ends as bank called; text said two), fixed yes (post-mortem names trigger). S-03 fixed (13 periods). Ledger totals, forecast, invariant test: done, passing in every scenario/mode.
P-01 (added by Henry mid-run): reproduced yes, fixed yes (engine rule, bots drop unaffordable expenses, disabled controls on build, rooms, landing tests).

## For Henry to review (non-blocking)

## Stopped
