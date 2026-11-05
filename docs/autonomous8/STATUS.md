# Autonomous run 8 status

## Current
Step: 1 (money bugs, ledger done; P-01 and playability check open)
Last commit: Plan 8 step 0: set up
Next action: finish the step 1 main-part check (tourism scenarios with --mode all, in scratchpad m1), then P-01 (affordability of plan expenses), then tag plan8-ledger.

## Checklist
- [x] Step 0: set up (tag plan8-baseline)
- [ ] Step 1: money bugs, one ledger and the invariant test (tag plan8-ledger)
- [ ] Step 2: money rules and the loan form (tag plan8-rules)
- [ ] Step 3: screens and wording (tag plan8-screens)
- [ ] Step 4: wrap up (tag plan8-complete)

## Findings
H-01 reproduced yes, fixed yes (loan buys only unpaid items). G-02/F-02 reproduced yes (cash below zero with one miss ends as bank called; text said two), fixed yes (post-mortem names trigger). S-03 fixed (13 periods). Ledger totals, forecast, invariant test: done, passing in every scenario/mode.
P-01 (added by Henry mid-run): not started; next after the step 1 playability check.

## For Henry to review (non-blocking)

## Stopped
