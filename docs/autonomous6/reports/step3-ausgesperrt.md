# Plan 6, step 3: Ausgesperrt

Tag `plan6-ausgesperrt`.

## What was built

- **Stages 3 to 5:**
  - Stage 3, a lounge with a bar for groups (25,000 EUR).
  - Stage 4, a flagship site near the city centre (60,000 EUR): the established look.
  - Stage 5, the Schwabing site: a second site in another district (50,000 EUR) that needs a game master on contract there, or the founder.
- **Offers:** three office offers in `messages/events/office.yaml`, next to the existing reception build-out.
- **UI and tests:** three stage drawings, and the shared stage tests in `plan6Stages.test.ts`.

## Changes during measurement

- **The lounge offer comes at stage 1 or 2** (was stage 2 only), as in the abroad scenarios: the careful bot declines the one-time stage 2 build-out.
- No tuning round was spent.

## Targets

1,000 test seeds, main part, long mode. Labels: leis-m1 (five strategies), leis-full (all strategies). Baseline step1-full.

| Target | Result | |
|---|---|---|
| O1 | careful 43.0, never_move 43.4 (−0.4) | met |
| O2 | always_move 9.3 (−33.7) | met |
| E1 | 91.6% of careful wins (±2.6), 30.5% of losses (±3.8), median week 70 | met |
| S1 | the careful bot never opens the Schwabing site; always_second opened it in 1 run | not shown |
| Playability | careful 43.0 (±3.1), top price_blind 50.9 | in band |

S1 was not tuned, for Rückenwind's reason: the careful bot moves only after a year's surplus, so stage 5 lies beyond a two-year game.

## Other strategies

Against step1-full:

- always_move fell from 39.7 to 9.3 (O2).
- leisure_vr_first_year fell from 33.4 to 25.7, beyond its margin.
- part_time fell from 53.7 to 50.2, reckless from 32.0 to 28.9, overborrow from 36.4 to 33.8, permanent from 49.5 to 47.0 and quarterly_rooms from 49.7 to 47.6.
- Everything else is within 2 points.

T7 is −7.9 (price-blind 50.9).

## Checks

`pnpm seeds` was rerun (no change). `pnpm lint` passes. `pnpm test`: 1,454 non-web tests pass; in the web project, one climbing browser case (scrappy at 375 px, a 15 s wait) timed out once and all 24 climbing cases passed on rerun, as in Rückenwind (flaky, unrelated). The content and engine changes reach only this scenario, so no protected proof was needed (plan section 1.3); the full report in step 4 covers it.

## For Henry to review

- leisure_vr_first_year lost 7.7 points; not investigated.
- E1 holds, but the established look also comes in 30.5% of losses (the flagship stage grants it on moving in, and some runs that move there still lose).
