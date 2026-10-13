# Step 6: the bank loan, then the restaurant (Hinterhof)

## What changed

- The bank loan as a general system (`docs/loan-proposal.md`, engine `systems/loan.ts`): a business plan in hours, an application the bank judges on visible numbers (own money against all borrowing, a ceiling before and after guests pay, the track record), an offer at a rate drawn per run with risk pricing, repayment-free months, monthly repayments from cash and then savings (the personal guarantee), a missed payment with a fee, and "Bank called the loan" after a second miss or when the money runs out with a payment missed. Loan money is its own ledger line; repayments, interest and fees count against runway and the win. Plan section, result lines, post-mortem lines, condition paths for events.
- The restaurant (`hinterhof`, long mode only): a fit-out every service requires, lunch, dinner, Sundays, a courtyard, catering and the delivery temptation, food cost as a share of the price, a cook and server crew per service, an own fit-out offered later (the optional second loan), 49 events of its own and the shared tourism events, quotes, names, intro, two dining room drawings.
- Engine additions (optional, absent in the protected games): `requires`, `unitCostShare`, `qualityBonus`, `leverageSpreadBp`; bookings archived into totals after a year and indexed by week (a restaurant run went from 2.1 s to about 0.13 s).
- Bots: the careful tourism bot learns the loan and the restaurant (required product first, borrowing what the plan needs, walk-ins in the roster, no thin-margin extras), only where a scenario offers a loan; loan variants `tourism_overborrow`, `tourism_reckless`, `tourism_refit_loan`; targets L1 to L4.
- Fixed on the way: Gratwanderung's intro described the old win rule (text only).

## Tests

Engine: the loan's plan, judgement, refusal, payout, interest-only months, annuity, missed payments and default, early repayment, post-mortem figures; required products and food cost. Web: the loan from plan to payout on screen, seven scene drawings; browser: axe and no sideways scrolling in Hinterhof at 375, 390, 430 and 1440 px in Chrome and WebKit. Lint and all tests pass.

## Targets (1,000 seeds, prefix `test`, `docs/balancing.md`)

T1 careful 24.4% (at the limit of 25), T2 to T5 and T7 to T12 pass. T6 fails on these seeds (reading +5.6, blind effort +3.7, limit a third; it passed on the tuning seeds, +3.5 and +1.7). L1 passes (second loan -1.0, taken in about half the runs), L4 passes. L2 fails (over-borrowing -0.2 ±1.4), L3 fails (reckless loan-caused defaults about 2.5%, needs 15%); L3 was restated with a written reason. Open issues in STATUS.md.

## Protected games

60 week Kantino and Zollstock (main, paired, inbox), Kantino long (main, inbox, funding) on 10,000 seeds, and Gratwanderung (1,000 seeds, every part of its report): see the gate in STATUS.md and the tag message.
