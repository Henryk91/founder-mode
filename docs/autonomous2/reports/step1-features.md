# Plan 2, step 1: the spec features of the tourism engine

## What changed

- **Trials (1a)**: each tourism scenario has its spec's own experiments in place of landing tests and pre-sales: Gratwanderung a pilot day (a group the player picks; a tourist leaves a review) and a test listing (85% tourists); Hinterhof a pop-up dinner (paid, mostly neighbours) and a lunch test (office lunch only), both before opening; Seeblick test rates (75% couples) and an open house (planners and office managers). Each trial is honest about the segments it reaches and silent about the others.
- **Vouchers (1a)**: sold in batches to the spec's segment (tourists, evening locals, couples) at its current price. Cash on its own ledger line, never revenue and not in runway; redeemed later as bookings that use capacity and pay nothing more; counted as earned in the win test only when redeemed. The Money tab shows vouchers still owed; the post-mortem counts those never redeemed.
- **Contracts (1b)**: permanent, part time and seasonal contracts per role, paid every week whether busy or not, cheaper per shift, better for reviews; notice for permanent and part time, none for seasonal.
- **Restaurant (1c)**: food prepared per service (unsold food thrown away at its food cost, guests beyond it turned away); cooks and servers apart (the floor serves up to a quarter beyond its staff, at a review cost).
- **Hotel (1d)**: rooms renovated one at a time (10,000 EUR, closed three weeks, at most three at once); a minimum stay of two nights on summer weekends.
- **UI**: Test, Who works, Build and Prices sections; results, Coming up, Market, Money and post-mortem lines. A new browser test opens each scenario mid-season (with a contract in notice, vouchers sold, rooms under works) and the loan form at 375, 390, 430 and 1440 px in Chromium and WebKit: nothing cut short, no sideways scrolling, axe clean. The tourism word check passes.
- **Values changed to keep Hinterhof playable** (it fell from 24% to 1% with kitchen and floor apart, because the old crew made the founder a free cook and server in one): servers at minijob cost and 150 lunch covers a shift, the founder can work the floor, food cost of a served plate at the low end of the spec's range now that waste is counted, sold-out walk-ins leave no review. Details in `docs/decisions.md`, plan 2 step 1.

## Targets before and after (1000 report seeds)

| Scenario | Target | Before (step 0) | After | Status after |
|---|---|---|---|---|
| Gratwanderung | T1 careful | 44.2% | 42.6% | pass |
| | T3 spread | 3.6 | 14.3 | pass (at the edge) |
| | T6 inbox | reading +14.6, effort +9.3 | reading +13.9, effort +6.2 | pass by its margin (at the limit) |
| | T7 to T11 | pass | pass | pass |
| | naive careful | 32.8% | 30.7% | (step 4 target) |
| Hinterhof | T1 careful | 24.4% | 19.5% | fail (step 4) |
| | T3 spread | 5.1 | 26.7 (evening locals 7.5%) | fail (step 4) |
| | T6 inbox | +5.6 / +3.7 | +3.5 / +2.0 | pass by its margin |
| | T12 speed | 79.8 s | 149.0 s per 1000 runs | at the limit (timed while other bot runs shared the machine) |
| | L2, L3 | fail | fail | (step 2) |
| | naive careful | 20.9% | 17.4% | (step 4) |
| Seeblick | T1 careful | 31.4% | 28.2% | pass |
| | T3 spread | 22.4 | 18.2 | fail (open, step 4) |
| | T6 inbox | +6.4 / +5.7 | +5.7 / +6.3 | fail (step 3) |
| | T7, T11 | fail | fail | (step 4) |
| | naive careful | 15.3% | 16.5% | (step 4) |

All other tourism targets pass before and after (`docs/balancing.md`). Every scenario stays inside the playable band (careful 15 to 55%, no strategy over 70%).

## Protected games

- Kantino and Zollstock, 60 weeks: main, paired, inbox, price and freelance parts (`--runs 1000 --wide-runs 10000`) identical to the step 0 report number for number apart from timings.
- Kantino long: main, paired, inbox, team and funding parts identical apart from timings.
- The 60 week fingerprints are unchanged (locked by the test); the tourism fingerprints are updated (tourism may change until step 4).

## Decisions and open issues

Decisions: `docs/decisions.md`, plan 2 step 1 (all AUTONOMOUS). New open issues: Hinterhof T1 and T3 (evening locals), Hinterhof T12 timing at the limit. Tag: `plan2-features`.
