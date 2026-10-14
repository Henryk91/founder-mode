# Plan 2, step 2: the bank loan teaches that debt is dangerous

## What changed

- The bank lends against a plan: listed items (Hinterhof: fit-out, wine list, courtyard, own fit-out, delivery kit; Seeblick: workspace, event room, wellness, rooms to renovate) and working capital of at most three months of fixed costs. The bank's text says so in the Plan section; more working capital is refused.
- Listed items are bought the week the money arrives (a company cost then, nothing more when built); only working capital reaches the account.
- Hinterhof's own fit-out is a product that can be listed; the delivery kit (9,000 EUR) is its financeable temptation (the spec's own; an early refit measured as a real investment, not a temptation). The refit stage lifts reviews less than before; its value is mostly evening walk-ins.
- L2 and L3 restated (rule 2.3); the post-mortem names what each loan bought, kept as working capital, and what each item earned from its own guests.
- Bots: the careful plan lists what its segment needs and working capital up to the cap; the over-borrower and the reckless bot list every item (temptation included) and the most working capital; after a refusal a fifth less.
- UI: the plan form (items, rooms, working capital, total) with the bank's rule; a browser test at every width in both browsers.

## Targets (1000 report seeds)

| Target | Hinterhof | Seeblick |
|---|---|---|
| L1 optional second loan within 5 | +2.4 ±1.2, pass | -0.4 ±0.8, pass |
| L2 temptation on credit loses at least 3 | -11.6 ±2.3, pass | -22.4 ±2.6, pass |
| L3 reckless ends owing 15 more than careful; careful loan-caused misses under 3% | +11.3 ±3.4; 0.5%, fail | +27.9 ±3.1; 0.9%, pass |
| L4 post-mortem names the loan | pass | pass |

Other changes against step 1: Hinterhof T1 21.5% (was 19.5, still under 25), T2 no-tests 11.9% (was 4.6: fail, new), T6 now passes (+3.1 / +1.2); Seeblick unchanged in status (T3, T6, T7, T11 fail).

## Protected games

Kantino and Zollstock 60 weeks (main, paired, inbox, price, freelance on 10,000 wide seeds) and Kantino long (main, paired, inbox, team, funding) identical to step 1 apart from timings.

## Open issues

L3 Hinterhof (the careful bot already ends owing in 76% of runs; step 4's retune of T1 should widen the gap), Hinterhof T2 no-tests 11.9%. Decisions: `docs/decisions.md`, plan 2 step 2. Tag `plan2-loan`.
