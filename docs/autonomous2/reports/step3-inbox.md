# Plan 2, step 3: the tourism inbox becomes a decision

## What changed

- Founder hours: guests take part of the founder's week (hours per unit served last week, capped), known before planning.
- Ten shared tourism events whose effortful answer pays only in the situation its text names; the cheapest answer is right otherwise.
- Seventeen events that send guests now do so only in the season or at the rating their text names; the reader follows such conditions.
- A `skips` part in the bots CLI (blind effort with one event left to its default) for the measurement.
- The runway band's change note now wraps instead of being cut at 375 and 390 px.

Details and the measurements behind them: `docs/decisions.md`, plan 2 step 3.

## T6 (1000 report seeds, `docs/balancing.md`)

| Scenario | Before (step 2) | After | Status |
|---|---|---|---|
| Gratwanderung | reading +13.9, blind effort +6.2 | reading +14.1, blind effort +3.8 (27%) | pass |
| Hinterhof | +3.1 / +1.2 | +2.1 / -0.1 | pass by its margin (reading at the limit of 3) |
| Seeblick | +6.4 / +6.0 | +10.2 / +6.8 (67%) | fail: open issue, budget used |

Reading clearly beats every blind policy in Gratwanderung and Seeblick; in Hinterhof reading's gain is small (+2.1).

## Event tables (1000 seeds, events seen in 150 seeds or more)

| Scenario | Judged | Cheapest wins | Rule (a third) |
|---|---|---|---|
| Gratwanderung | 67 | 38 (57%) | pass |
| Hinterhof | 72 | 51 (71%) | pass |
| Seeblick | 67 | 32 (48%) | pass |

## Other tourism targets after step 3

Gratwanderung T3 spread 17.2 (fail, was 14.3) and T11 (fail: strict +2.8 overall but no split where flexible wins by its margin); Hinterhof T1 17.3%, T2 no-tests 6.8%, T3 22.9, L3 gap +10.7 (fail); Seeblick T3 23.8, T11 (fail), T7 now within margin. All are step 4's work.

## Protected games

Kantino and Zollstock 60 weeks and Kantino long: identical to step 2 apart from timings.

Tag: `plan2-inbox`.
