# The bank loan (step 6, Part A of `docs/scenario-restaurant.md`)

A general system switched on by a `loan` block in a scenario. Built for the restaurant and the hotel. Not offered in Kantino long mode or Gratwanderung: both are protected games, and a new option would change them (decisions, step 6).

## Sources (checked October 2026)

- The public start-up loan the terms are modelled on (not named in the game): up to 200,000 EUR, terms of 5 up to 20 years (10 for the variant used here), repayment-free years at the start possible (fuer-gruender.de, business-on.de, December 2025).
- Its rates start at about 3.7 to 3.8% a year (IHK Hanau; accountable.de); the programme's own rate table was not readable. A local bank's own small business loan costs more: the game draws a fixed 4.5 to 7.5% per run (estimate).
- Own money: chambers of commerce advise 15 to 25% of the total need, at least 15% for the public equity programme (IHK Braunschweig); too little own money is among the commonest reasons banks refuse (make-it-in-germany.com). The game asks for 20%.

## Rules

- **Applying.** A business plan takes founder hours (planned in a Plan section, kept between weeks, 30 h in the restaurant), then an application names the amount, the term (5, 7 or 10 years) and a repayment-free start (none, 6 or 12 months). The meeting costs hours; the answer comes after `decisionWeeks`.
- **What the bank judges, all visible:** own money put in (the company's starting money plus every transfer from savings) against own money plus all borrowing, at least `ownShare`; the amount against a ceiling: `unprovenMaxCents` before any guest has paid, then the larger of that and `revenueMultiple` times the last four weeks' revenue times twelve, never above `maxCents`; and the run's track record: a missed payment means no new loan. The answer is the same for the same numbers. A refusal names its one main reason in plain words; the player may apply again once the plan is redone (half the hours) after `retryWeeks`.
- **The offer** shows the rate (drawn once per run, hidden until offered) and the monthly payment. Accepting pays the money into the company the next month end. Declining ends it.
- **Repayments** at month ends: interest only during the repayment-free months, then a fixed annuity. Paid from company cash; as everywhere, savings top the company up (the personal guarantee). If cash and savings together cannot pay, the payment is missed: a fee is added to the balance and a reminder arrives; a second missed month in a row ends the run as "Bank called the loan".
- **Early repayment** of a loan at a month end, with a fee of `earlyFeeShare` of the balance.
- **Money.** Loan money is its own ledger line, never revenue. Interest, repayments and fees are outgoings in the runway and in the win test.
- **Post-mortem:** each loan's amount, interest paid, what was spent on products and fit-out after it arrived, and whether it was paid back, still running or called.

## Targets (judged in the restaurant, step 6)

- L1 Where a loan is optional (the restaurant's second loan for its own fit-out), borrowing and not borrowing are both viable: neither wins by more than 5 points.
- L2 Over-borrowing (the maximum, early) loses to borrowing what the plan needs.
- L3 Default is reachable but avoidable: the careful bot defaults in under 3% of runs, a reckless bot in over 15%.
- L4 The post-mortem names the loan's interest, what it paid for, and whether it was paid back.
